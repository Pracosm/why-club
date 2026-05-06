import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireUser } from "./lib/auth";
import { appError } from "./lib/errors";
import { createShipment, fetchTracking } from "./lib/shiprocket";
import type { Doc } from "./_generated/dataModel";

type OrderDoc = Doc<"orders">;
type ShipmentResult =
  | Awaited<ReturnType<typeof createShipment>>
  | {
      skipped: boolean;
      reason: string;
    };

type SyncTrackingResult = {
  ok: boolean;
  reason?: string;
  tracking?: Awaited<ReturnType<typeof fetchTracking>>;
};

function mapTrackingStatus(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("deliver")) {
    return "delivered" as const;
  }

  if (normalized.includes("ship") || normalized.includes("transit")) {
    return "shipped" as const;
  }

  return "processing" as const;
}

export const listForOrder = query({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const order = await ctx.db.get("orders", args.orderId);

    if (!order) {
      return [];
    }

    const canAccess =
      (order.userId && order.userId === user._id) ||
      ["super_admin", "admin"].includes(user.role);

    if (!canAccess) {
      throw appError("FORBIDDEN", "You do not have access to this shipment.");
    }

    return await ctx.db
      .query("shippingUpdates")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();
  },
});

export const dispatchOrder = action({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args): Promise<ShipmentResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw appError("UNAUTHENTICATED", "You must sign in to continue.");
    }

    const actor = await ctx.runQuery(internal.users.getByIdInternal, {
      userId,
    });

    if (!actor || !["super_admin", "admin"].includes(actor.role)) {
      throw appError("FORBIDDEN", "You do not have shipping access.");
    }

    return await ctx.runAction(internal.shipping.createShipmentForPaidOrder, {
      orderId: args.orderId,
    });
  },
});

export const syncTracking = action({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args): Promise<SyncTrackingResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw appError("UNAUTHENTICATED", "You must sign in to continue.");
    }

    const actor = await ctx.runQuery(internal.users.getByIdInternal, {
      userId,
    });

    if (!actor || !["super_admin", "admin"].includes(actor.role)) {
      throw appError("FORBIDDEN", "You do not have shipping access.");
    }

    const order = await ctx.runQuery(internal.orders.getForAction, {
      orderId: args.orderId,
    });

    if (!order?.shiprocketShipmentId) {
      return {
        ok: false,
        reason: "No Shiprocket shipment is attached to this order yet.",
      };
    }

    const tracking = await fetchTracking(order.shiprocketShipmentId);

    if (tracking.skipped) {
      return {
        ok: true,
        tracking,
      };
    }

    await ctx.runMutation(internal.shipping.recordTrackingUpdateInternal, {
      orderId: args.orderId,
      trackingStatus: tracking.trackingStatus,
      location: tracking.location,
      trackedAt: tracking.timestamp ? Date.parse(tracking.timestamp) : Date.now(),
      awbCode: undefined,
      courierName: "Shiprocket",
    });

    return {
      ok: true,
      tracking,
    };
  },
});

export const createShipmentForPaidOrder = internalAction({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const order: OrderDoc | null = await ctx.runQuery(internal.orders.getForAction, {
      orderId: args.orderId,
    });

    if (!order || order.paymentStatus !== "captured") {
      return {
        skipped: true,
        reason: "Order is not paid yet.",
      };
    }

    if (order.shiprocketShipmentId) {
      return {
        skipped: true,
        reason: "Shiprocket shipment already exists for this order.",
      };
    }

    if (!order.shippingAddress) {
      return {
        skipped: true,
        reason: "Order has no shipping address yet.",
      };
    }

    const user = order.userId
      ? await ctx.runQuery(internal.users.getByIdInternal, {
          userId: order.userId,
        })
      : null;

    const shipment = await createShipment({
      orderId: `${order._id}`,
      totalAmount: order.totalAmount,
      customerName: order.shippingAddress.fullName,
      email: order.customerEmail ?? user?.email,
      phoneNumber: order.shippingAddress.phoneNumber,
      addressLine1: order.shippingAddress.line1,
      addressLine2: order.shippingAddress.line2,
      city: order.shippingAddress.city,
      state: order.shippingAddress.state,
      postalCode: order.shippingAddress.postalCode,
      country: order.shippingAddress.country,
      items: order.items.map((item: (typeof order.items)[number]) => ({
        name: item.productTitle,
        sku: item.productSlug,
        units: item.quantity,
        sellingPrice: item.unitPrice,
      })),
    });

    if (!shipment.skipped) {
      await ctx.runMutation(internal.orders.updateShippingStateInternal, {
        orderId: args.orderId,
        status: "processing",
        shiprocketOrderId: shipment.shiprocketOrderId,
        shiprocketShipmentId: shipment.shiprocketShipmentId,
      });
    }

    if (shipment.awbCode) {
      await ctx.runMutation(internal.shipping.recordTrackingUpdateInternal, {
        orderId: args.orderId,
        awbCode: shipment.awbCode,
        courierName: "Shiprocket",
        trackingStatus: shipment.skipped ? "demo_pending_dispatch" : "shipment_created",
        trackedAt: Date.now(),
      });
    }

    return shipment;
  },
});

export const findOrderByShipmentId = internalQuery({
  args: {
    shipmentId: v.string(),
  },
  handler: async (ctx, args) => {
    const orders = await ctx.db.query("orders").collect();
    return (
      orders.find((order) => order.shiprocketShipmentId === args.shipmentId) ?? null
    );
  },
});

export const recordTrackingUpdateInternal = internalMutation({
  args: {
    orderId: v.id("orders"),
    awbCode: v.optional(v.string()),
    courierName: v.optional(v.string()),
    trackingStatus: v.string(),
    location: v.optional(v.string()),
    trackedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const updateId = await ctx.db.insert("shippingUpdates", {
      ...args,
    });

    await ctx.db.patch(args.orderId, {
      status: mapTrackingStatus(args.trackingStatus),
      updatedAt: Date.now(),
    });

    return await ctx.db.get("shippingUpdates", updateId);
  },
});
