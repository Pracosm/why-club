import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { fetchRazorpayOrderDetails, verifyWebhookSignature } from "./lib/razorpay";
import {
  MAX_WEBHOOK_BODY_BYTES,
  hashPayload,
  parseJsonObject,
} from "./lib/webhookPayloads";

type RazorpayPaymentEntity = {
  order_id?: string;
  id?: string;
  error_description?: string;
};

type MarkPaidResult = {
  ok: boolean;
  order: unknown;
  shipmentRequired: boolean;
};

function getObjectField(
  value: Record<string, unknown> | undefined,
  key: string,
) {
  const field = value?.[key];
  return field && typeof field === "object" && !Array.isArray(field)
    ? (field as Record<string, unknown>)
    : undefined;
}

function getStringField(
  value: Record<string, unknown> | undefined,
  key: string,
) {
  const field = value?.[key];
  return typeof field === "string" ? field : undefined;
}

function getRazorpayPayment(payload: Record<string, unknown>) {
  const payloadObject = getObjectField(payload, "payload");
  const paymentObject = getObjectField(payloadObject, "payment");
  const entity = getObjectField(paymentObject, "entity");

  return entity as RazorpayPaymentEntity | undefined;
}

function mapMagicAddress(address: {
  city?: string;
  contact?: string;
  country?: string;
  line1?: string;
  line2?: string;
  name?: string;
  state?: string;
  zipcode?: string;
} | undefined) {
  if (!address?.line1 || !address.city || !address.state || !address.zipcode) {
    return undefined;
  }

  return {
    fullName: address.name ?? "Guest customer",
    phoneNumber: address.contact ?? "",
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postalCode: address.zipcode,
    country: address.country?.toUpperCase() === "IN" ? "India" : (address.country ?? "India"),
  };
}

export const handleRazorpayWebhook = internalAction({
  args: {
    rawBody: v.string(),
    signature: v.union(v.string(), v.null()),
    eventId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const signatureCheck = await verifyWebhookSignature({
      rawBody: args.rawBody,
      signature: args.signature,
    });
    if (!signatureCheck.verified) {
      return {
        ok: false,
        ...signatureCheck,
      };
    }

    const parseResult = parseJsonObject(args.rawBody);
    if (!parseResult.ok) {
      return {
        ok: false,
        reason: parseResult.reason,
      };
    }

    const payload = parseResult.value;
    const eventType = getStringField(payload, "event") ?? "unknown";
    const payloadHash = await hashPayload(args.rawBody);
    const payment = getRazorpayPayment(payload);
    const razorpayOrderId = payment?.order_id;

    if (!razorpayOrderId) {
      return {
        ok: false,
        reason: "Missing Razorpay order reference.",
      };
    }

    const paymentId = payment?.id;
    const order = await ctx.runQuery(internal.orders.findByRazorpayOrderId, {
      razorpayOrderId,
    });

    if (!order) {
      return {
        ok: false,
        reason: "Order not found for webhook payload.",
      };
    }

    if (eventType === "payment.captured" && !paymentId) {
      return {
        ok: false,
        reason: "Missing Razorpay payment reference.",
      };
    }

    const eventRecord = await ctx.runMutation(
      internal.webhooks.recordWebhookEventInternal,
      {
        provider: "razorpay",
        eventId: args.eventId,
        eventType,
        payloadHash,
        status:
          eventType === "payment.captured" || eventType === "payment.failed"
            ? "processed"
            : "ignored",
        orderId: order._id,
      },
    );

    if (eventRecord.duplicate) {
      return {
        ok: true,
        duplicate: true,
        event: eventType,
      };
    }

    if (eventType === "payment.captured") {
      if (!paymentId) {
        return {
          ok: false,
          reason: "Missing Razorpay payment reference.",
        };
      }

      const razorpayOrder = await fetchRazorpayOrderDetails(razorpayOrderId);
      const shippingAddress = mapMagicAddress(
        razorpayOrder.customerDetails?.shippingAddress,
      );

      const markPaidResult: MarkPaidResult = await ctx.runMutation(
        internal.orders.markPaidInternal,
        {
          orderId: order._id,
          razorpayOrderId,
          razorpayPaymentId: paymentId,
          customerEmail: razorpayOrder.customerDetails?.email,
          customerPhone: razorpayOrder.customerDetails?.contact,
          customerName: shippingAddress?.fullName,
          shippingAddress,
        },
      );

      if (markPaidResult.shipmentRequired) {
        await ctx.runAction(internal.shipping.createShipmentForPaidOrder, {
          orderId: order._id,
        });
      }
    }

    if (eventType === "payment.failed") {
      await ctx.runMutation(internal.orders.markPaymentFailedInternal, {
        orderId: order._id,
        reason: payment?.error_description ?? "Razorpay reported payment failure.",
      });
    }

    return {
      ok: true,
      event: eventType,
    };
  },
});

export const recordWebhookEventInternal = internalMutation({
  args: {
    provider: v.union(v.literal("razorpay"), v.literal("shiprocket")),
    eventId: v.optional(v.string()),
    eventType: v.string(),
    payloadHash: v.string(),
    status: v.union(
      v.literal("processed"),
      v.literal("ignored"),
      v.literal("failed"),
    ),
    reason: v.optional(v.string()),
    orderId: v.optional(v.id("orders")),
  },
  handler: async (ctx, args) => {
    if (args.eventId) {
      const existingByEvent = await ctx.db
        .query("webhookEvents")
        .withIndex("by_provider_event", (q) =>
          q.eq("provider", args.provider).eq("eventId", args.eventId),
        )
        .first();

      if (existingByEvent) {
        return {
          duplicate: true,
          eventId: existingByEvent._id,
        };
      }
    }

    const existingByHash = await ctx.db
      .query("webhookEvents")
      .withIndex("by_payload_hash", (q) => q.eq("payloadHash", args.payloadHash))
      .filter((q) => q.eq(q.field("provider"), args.provider))
      .first();

    if (existingByHash) {
      return {
        duplicate: true,
        eventId: existingByHash._id,
      };
    }

    const eventId: Id<"webhookEvents"> = await ctx.db.insert("webhookEvents", {
      provider: args.provider,
      eventId: args.eventId,
      eventType: args.eventType,
      payloadHash: args.payloadHash,
      status: args.status,
      reason: args.reason,
      orderId: args.orderId,
      createdAt: Date.now(),
    });

    return {
      duplicate: false,
      eventId,
    };
  },
});

export const handleShiprocketWebhook = internalAction({
  args: {
    rawBody: v.string(),
  },
  handler: async (ctx, args) => {
    if (new TextEncoder().encode(args.rawBody).byteLength > MAX_WEBHOOK_BODY_BYTES) {
      return {
        ok: false,
        reason: "Webhook payload is too large.",
      };
    }

    const parseResult = parseJsonObject(args.rawBody);
    if (!parseResult.ok) {
      return {
        ok: false,
        reason: parseResult.reason,
      };
    }

    const payload = parseResult.value;
    const shipmentId =
      typeof payload.shipment_id === "string"
        ? payload.shipment_id
        : typeof payload.shipment_id === "number"
          ? `${payload.shipment_id}`
          : undefined;

    if (!shipmentId) {
      return {
        ok: false,
        reason: "Missing shipment identifier.",
      };
    }

    const orders = await ctx.runQuery(internal.shipping.findOrderByShipmentId, {
      shipmentId,
    });

    if (!orders) {
      return {
        ok: false,
        reason: "Order not found for Shiprocket webhook.",
      };
    }

    const status =
      typeof payload.current_status === "string"
        ? payload.current_status
        : typeof payload.status === "string"
          ? payload.status
          : "tracking_update_received";

    await ctx.runMutation(internal.shipping.recordTrackingUpdateInternal, {
      orderId: orders._id,
      awbCode:
        typeof payload.awb_code === "string" ? payload.awb_code : undefined,
      courierName:
        typeof payload.courier_name === "string"
          ? payload.courier_name
          : "Shiprocket",
      trackingStatus: status,
      location:
        typeof payload.current_location === "string"
          ? payload.current_location
          : undefined,
      trackedAt: Date.now(),
    });

    return {
      ok: true,
    };
  },
});
