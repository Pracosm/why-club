import { httpRouter } from "convex/server";
import { v } from "convex/values";
import { httpAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function summarizeCoupon(coupon: {
  code: string;
  title?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderValue: number;
}) {
  const discount =
    coupon.discountType === "percentage"
      ? `${coupon.discountValue}% off`
      : `INR ${coupon.discountValue} off`;
  const minimum =
    coupon.minOrderValue > 0
      ? ` on orders above INR ${coupon.minOrderValue}`
      : "";

  return {
    code: coupon.code,
    summary: coupon.title ?? `${discount}${minimum}`,
    description: `${discount}${minimum}`,
  };
}

function computeDiscount(
  coupon: { discountType: "percentage" | "fixed"; discountValue: number },
  subtotal: number,
) {
  if (coupon.discountType === "percentage") {
    return Math.round((subtotal * coupon.discountValue) / 100);
  }

  return Math.min(subtotal, coupon.discountValue);
}

async function readJsonObject(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

export const listActiveMagicPromotions = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const coupons = await ctx.db
      .query("coupons")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    return coupons
      .filter((coupon) => {
        if (coupon.expiresAt && coupon.expiresAt < now) {
          return false;
        }
        return (
          coupon.usageLimit === undefined || coupon.usedCount < coupon.usageLimit
        );
      })
      .map(summarizeCoupon);
  },
});

export const getMagicPromotion = internalQuery({
  args: {
    code: v.string(),
    orderId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const coupon = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .unique();

    if (!coupon || !coupon.isActive) {
      return null;
    }

    const now = Date.now();
    if (coupon.expiresAt && coupon.expiresAt < now) {
      return null;
    }

    if (coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit) {
      return null;
    }

    let subtotal = coupon.minOrderValue;
    if (args.orderId) {
      const orderId = ctx.db.normalizeId("orders", args.orderId);
      if (orderId) {
        const order = await ctx.db.get(orderId);
        if (order) {
          subtotal = order.totalAmount + order.discountAmount;
        }
      }
    }

    if (subtotal < coupon.minOrderValue) {
      return null;
    }

    return {
      reference_id: coupon._id,
      code: coupon.code,
      type: "coupon",
      value: computeDiscount(coupon, subtotal) * 100,
      value_type: "fixed_amount",
      description: summarizeCoupon(coupon).description,
    };
  },
});

http.route({
  path: "/checkout/shipping-info",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    const body = (await readJsonObject(request)) as {
      addresses?: Array<{ id?: string; zipcode?: string; country?: string }>;
    };

    return jsonResponse({
      addresses: (body.addresses ?? []).map((address, index) => ({
        id: address.id ?? `${index}`,
        zipcode: address.zipcode ?? "",
        country: address.country ?? "IN",
        shipping_methods: [
          {
            id: "free-prepaid",
            name: "Free prepaid shipping",
            description: "Free prepaid shipping",
            serviceable: true,
            shipping_fee: 0,
            cod: false,
            cod_fee: 0,
          },
        ],
      })),
    });
  }),
});

http.route({
  path: "/checkout/promotions",
  method: "POST",
  handler: httpAction(async (ctx) => {
    const promotions = await ctx.runQuery(internal.http.listActiveMagicPromotions);
    return jsonResponse({ promotions });
  }),
});

http.route({
  path: "/checkout/promotions/apply",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = (await readJsonObject(request)) as {
      code?: unknown;
      order_id?: unknown;
    };

    if (typeof body.code !== "string") {
      return jsonResponse({ error: "Promotion code is required." }, 400);
    }

    const promotion = await ctx.runQuery(internal.http.getMagicPromotion, {
      code: body.code,
      orderId: typeof body.order_id === "string" ? body.order_id : undefined,
    });

    if (!promotion) {
      return jsonResponse({ error: "Promotion is not applicable." }, 400);
    }

    return jsonResponse({ promotion });
  }),
});

http.route({
  path: "/webhooks/razorpay",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");
    const eventId = request.headers.get("x-razorpay-event-id") ?? undefined;

    const result = await ctx.runAction(internal.webhooks.handleRazorpayWebhook, {
      rawBody,
      signature,
      eventId,
    });

    return Response.json(result, {
      status: result.ok ? 200 : 202,
    });
  }),
});

http.route({
  path: "/webhooks/shiprocket",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const rawBody = await request.text();
    const result = await ctx.runAction(internal.webhooks.handleShiprocketWebhook, {
      rawBody,
    });

    return Response.json(result, {
      status: result.ok ? 200 : 202,
    });
  }),
});

export default http;
