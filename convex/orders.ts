import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAnyRole, requireUser } from "./lib/auth";
import { appError } from "./lib/errors";
import {
  resolveCaptureTransition,
  resolveFailureTransition,
} from "./lib/paymentState";
import { sanitizeAuditMetadata, type AuditMetadata } from "./lib/auditEvents";
import {
  isCouponUsableAtCapture,
  normalizeCouponCode,
} from "./lib/couponRules";
import {
  assertInventoryAvailable,
  decrementInventoryCount,
} from "./lib/inventory";
import { computeDiscount, computeOrderTotal } from "./lib/orderPricing";
import { logInfo, logWarn } from "./lib/logging";
import {
  createRazorpayMagicOrder,
  createRazorpayOrder,
  fetchRazorpayOrderDetails,
  fetchRazorpayOrderPayments,
  verifyCheckoutSignature,
} from "./lib/razorpay";
import {
  orderItemInputValidator,
  orderStatusValidator,
  shippingAddressValidator,
} from "./lib/validators";
import type { Doc, Id } from "./_generated/dataModel";

const ORDER_CURRENCY = "INR";
type OrderDoc = Doc<"orders">;

type MagicAddress = {
  city?: string;
  contact?: string;
  country?: string;
  line1?: string;
  line2?: string;
  name?: string;
  state?: string;
  zipcode?: string;
};

type CheckoutSessionResult =
  | {
      mode: "existing";
      orderId: Id<"orders">;
      razorpayOrderId?: string;
    }
  | {
      mode: "demo" | "live";
      keyId: string;
      razorpayOrderId: string;
      amount: number;
      currency: string;
      receipt: string;
    };

type VerifyPaymentResult =
  | {
      ok: false;
    }
  | {
      ok: true;
      paymentResult: OrderDoc | null;
    };

type MarkPaidResult = {
  ok: true;
  order: OrderDoc | null;
  shipmentRequired: boolean;
};

type PricingCtx = {
  db: QueryCtx["db"] | MutationCtx["db"];
};

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return toHex(digest);
}

function normalizeGuestToken(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function validateOrderItemsForCheckout(
  items: Array<{ productId: Id<"products">; quantity: number; size?: string }>,
) {
  if (items.length === 0) {
    throw appError("INVALID_INPUT", "Add at least one item before checkout.");
  }

  const seen = new Set<string>();
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10) {
      throw appError("INVALID_INPUT", "Cart item quantity must be between 1 and 10.");
    }

    const key = `${item.productId}:${item.size ?? ""}`;
    if (seen.has(key)) {
      throw appError("INVALID_INPUT", "Cart contains duplicate product/size lines.");
    }
    seen.add(key);
  }
}

async function priceCheckoutItems(
  ctx: PricingCtx,
  args: {
    items: Array<{ productId: Id<"products">; quantity: number; size?: string }>;
    couponCode?: string;
  },
) {
  validateOrderItemsForCheckout(args.items);

  const products = await Promise.all(
    args.items.map((item) => ctx.db.get(item.productId)),
  );
  const snapshots = args.items.map((item, index) => {
    const product = products[index];
    if (!product || !product.isPublished) {
      throw appError("NOT_FOUND", "One or more products are unavailable.");
    }

    if (item.quantity > product.inventoryCount) {
      throw appError(
        "OUT_OF_STOCK",
        `${product.title} does not have enough inventory.`,
      );
    }

    if (item.size && product.soldOutSizes.includes(item.size)) {
      throw appError(
        "OUT_OF_STOCK",
        `${product.title} is sold out in size ${item.size}.`,
      );
    }

    return {
      productId: product._id,
      productSlug: product.slug,
      productTitle: product.title,
      quantity: item.quantity,
      size: item.size,
      unitPrice: product.sellingPrice,
      lineTotal: product.sellingPrice * item.quantity,
    };
  });
  const subtotal = snapshots.reduce((total, item) => total + item.lineTotal, 0);
  const normalizedCouponCode = args.couponCode
    ? normalizeCouponCode(args.couponCode)
    : undefined;
  let couponId: Id<"coupons"> | undefined;
  let couponCode: string | undefined;
  let discountAmount = 0;

  if (normalizedCouponCode) {
    const coupon = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", normalizedCouponCode))
      .unique();

    if (!coupon || !coupon.isActive) {
      throw appError("INVALID_COUPON", "Coupon code is invalid.");
    }

    if (coupon.expiresAt && coupon.expiresAt < Date.now()) {
      throw appError("INVALID_COUPON", "Coupon code has expired.");
    }

    if (coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit) {
      throw appError("INVALID_COUPON", "Coupon usage limit has been reached.");
    }

    if (subtotal < coupon.minOrderValue) {
      throw appError(
        "INVALID_COUPON",
        `Coupon requires an order value of ₹${coupon.minOrderValue} or more.`,
      );
    }

    couponId = coupon._id;
    couponCode = coupon.code;
    discountAmount = computeDiscount(coupon, subtotal);
  }

  return {
    subtotal,
    discountAmount,
    shippingAmount: 0,
    totalAmount: computeOrderTotal(subtotal, discountAmount),
    currency: ORDER_CURRENCY,
    couponId,
    couponCode,
    items: snapshots,
  };
}

async function recordOrderEvent(
  ctx: MutationCtx,
  args: {
    orderId: Id<"orders">;
    type: string;
    actor: "system" | "customer" | "admin" | "provider";
    message: string;
    metadata?: AuditMetadata;
  },
) {
  await ctx.db.insert("orderEvents", {
    orderId: args.orderId,
    type: args.type,
    actor: args.actor,
    message: args.message,
    metadata: sanitizeAuditMetadata(args.metadata),
    createdAt: Date.now(),
  });
}

function mapMagicAddress(address: MagicAddress | undefined) {
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

function findCapturedPayment(
  payments: Awaited<ReturnType<typeof fetchRazorpayOrderPayments>>,
) {
  return (
    payments.find(
      (payment) => payment.status === "captured" || payment.captured === true,
    ) ?? null
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "data" in error &&
    error.data &&
    typeof error.data === "object" &&
    "message" in error.data &&
    typeof error.data.message === "string"
  ) {
    return error.data.message;
  }

  return "Checkout preview failed.";
}

async function canAccessOrder(args: {
  order: OrderDoc;
  userId: Id<"users"> | null;
  guestAccessToken?: string;
}) {
  if (args.userId && args.order.userId === args.userId) {
    return true;
  }

  const guestAccessToken = normalizeGuestToken(args.guestAccessToken);
  if (!guestAccessToken || !args.order.guestAccessTokenHash) {
    return false;
  }

  return (await sha256Hex(guestAccessToken)) === args.order.guestAccessTokenHash;
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query("orders")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAnyRole(ctx, ["super_admin", "admin"]);
    return await ctx.db.query("orders").collect();
  },
});

export const listAllPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(orderStatusValidator),
    paymentStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("authorized"),
        v.literal("captured"),
        v.literal("failed"),
        v.literal("refunded"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    await requireAnyRole(ctx, ["super_admin", "admin"]);
    if (args.status !== undefined) {
      return await ctx.db
        .query("orders")
        .withIndex("by_status", (q) => q.eq("status", args.status ?? "pending"))
        .order("desc")
        .paginate(args.paginationOpts);
    }

    if (args.paymentStatus !== undefined) {
      return await ctx.db
        .query("orders")
        .withIndex("by_payment_status", (q) =>
          q.eq("paymentStatus", args.paymentStatus ?? "pending"),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }

    return await ctx.db
      .query("orders")
      .withIndex("by_created_at")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getById = query({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const order = await ctx.db.get("orders", args.orderId);

    if (!order) {
      return null;
    }

    const canAccess =
      order.userId === user._id || ["super_admin", "admin"].includes(user.role);

    if (!canAccess) {
      throw appError("FORBIDDEN", "You do not have access to this order.");
    }

    return order;
  },
});

export const listEventsForOrder = query({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const order = await ctx.db.get(args.orderId);

    if (!order) {
      return [];
    }

    const canAccess =
      order.userId === user._id || ["super_admin", "admin"].includes(user.role);
    if (!canAccess) {
      throw appError("FORBIDDEN", "You do not have access to this order.");
    }

    return await ctx.db
      .query("orderEvents")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();
  },
});

export const dashboardSummary = query({
  args: {
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAnyRole(ctx, ["super_admin", "admin"]);
    const orders = (await ctx.db
      .query("orders")
      .withIndex("by_created_at")
      .order("desc")
      .take(500)).filter((order) => {
        if (args.from !== undefined && order.createdAt < args.from) {
          return false;
        }
        if (args.to !== undefined && order.createdAt > args.to) {
          return false;
        }
        return true;
      });
    const revenue = orders
      .filter((order) => order.paymentStatus === "captured")
      .reduce((total, order) => total + order.totalAmount, 0);

    return {
      totalOrders: orders.length,
      paidOrders: orders.filter((order) => order.paymentStatus === "captured").length,
      pendingOrders: orders.filter((order) => order.status === "pending").length,
      revenue,
    };
  },
});

export const previewCheckoutTotals = query({
  args: {
    items: v.array(orderItemInputValidator),
    couponCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let pricing: Awaited<ReturnType<typeof priceCheckoutItems>>;

    try {
      pricing = await priceCheckoutItems(ctx, args);
    } catch (error) {
      if (!args.couponCode) {
        throw error;
      }

      pricing = await priceCheckoutItems(ctx, {
        items: args.items,
      });

      return {
        ...pricing,
        couponStatus: {
          ok: false,
          code: normalizeCouponCode(args.couponCode),
          message: getErrorMessage(error),
        },
      };
    }

    return {
      ...pricing,
      couponStatus: pricing.couponCode
        ? {
            ok: true,
            code: pricing.couponCode,
            message: `Coupon ${pricing.couponCode} applied.`,
          }
        : {
            ok: false,
            code: args.couponCode ? normalizeCouponCode(args.couponCode) : undefined,
            message: args.couponCode ? "Coupon was not applied." : undefined,
          },
    };
  },
});

export const createMagicCheckout = action({
  args: {
    items: v.array(orderItemInputValidator),
    couponCode: v.optional(v.string()),
    prefill: v.optional(
      v.object({
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        contact: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args): Promise<CheckoutSessionResult & {
    orderId: Id<"orders">;
    guestAccessToken?: string;
  }> => {
    const userId = await getAuthUserId(ctx);
    const guestAccessToken = userId ? undefined : crypto.randomUUID();
    const guestAccessTokenHash = guestAccessToken
      ? await sha256Hex(guestAccessToken)
      : undefined;

    const pendingOrder = await ctx.runMutation(
      internal.orders.createMagicPendingInternal,
      {
        items: args.items,
        couponCode: args.couponCode,
        userId: userId ?? undefined,
        guestAccessTokenHash,
        customerEmail: args.prefill?.email,
        customerPhone: args.prefill?.contact,
        customerName: args.prefill?.name,
      },
    );

    const checkout = await createRazorpayMagicOrder({
      amount: pendingOrder.totalAmount,
      currency: pendingOrder.currency,
      receipt: `${pendingOrder.orderId}`,
      notes: {
        orderId: `${pendingOrder.orderId}`,
        checkoutMode: userId ? "signed_in" : "guest_magic",
      },
      lineItems: pendingOrder.items.map((item) => ({
        sku: item.productSlug,
        variantId: `${item.productSlug}-${item.size ?? "default"}`,
        price: item.unitPrice,
        offerPrice: item.unitPrice,
        quantity: item.quantity,
        name: item.productTitle,
        description: item.productTitle,
      })),
    });

    await ctx.runMutation(internal.orders.attachRazorpayOrder, {
      orderId: pendingOrder.orderId,
      razorpayOrderId: checkout.razorpayOrderId,
    });

    return {
      ...checkout,
      orderId: pendingOrder.orderId,
      guestAccessToken,
    };
  },
});

export const createStandardCheckout = action({
  args: {
    items: v.array(orderItemInputValidator),
    shippingAddress: shippingAddressValidator,
    couponCode: v.optional(v.string()),
    guestAccessToken: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<CheckoutSessionResult & {
    orderId: Id<"orders">;
    guestAccessToken?: string;
  }> => {
    const userId = await getAuthUserId(ctx);
    const guestAccessToken = userId
      ? undefined
      : normalizeGuestToken(args.guestAccessToken) ?? crypto.randomUUID();
    const guestAccessTokenHash = guestAccessToken
      ? await sha256Hex(guestAccessToken)
      : undefined;

    const pendingOrder = await ctx.runMutation(
      internal.orders.createStandardPendingInternal,
      {
        items: args.items,
        shippingAddress: args.shippingAddress,
        couponCode: args.couponCode,
        userId: userId ?? undefined,
        guestAccessTokenHash,
        customerEmail: args.customerEmail,
        customerPhone: args.shippingAddress.phoneNumber,
        customerName: args.shippingAddress.fullName,
      },
    );

    const checkout = await createRazorpayOrder({
      amount: pendingOrder.totalAmount,
      currency: pendingOrder.currency,
      receipt: `${pendingOrder.orderId}`,
      notes: {
        orderId: `${pendingOrder.orderId}`,
        checkoutMode: userId ? "signed_in" : "guest_standard",
      },
    });

    await ctx.runMutation(internal.orders.attachRazorpayOrder, {
      orderId: pendingOrder.orderId,
      razorpayOrderId: checkout.razorpayOrderId,
    });

    return {
      ...checkout,
      orderId: pendingOrder.orderId,
      guestAccessToken,
    };
  },
});

export const createPending = mutation({
  args: {
    items: v.array(orderItemInputValidator),
    shippingAddress: shippingAddressValidator,
    couponCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    validateOrderItemsForCheckout(args.items);

    const products = await Promise.all(
      args.items.map((item) => ctx.db.get("products", item.productId)),
    );

    const snapshots = args.items.map((item, index) => {
      const product = products[index];
      if (!product || !product.isPublished) {
        throw appError("NOT_FOUND", "One or more products are unavailable.");
      }

      if (item.quantity > product.inventoryCount) {
        throw appError(
          "OUT_OF_STOCK",
          `${product.title} does not have enough inventory.`,
        );
      }

      if (item.size && product.soldOutSizes.includes(item.size)) {
        throw appError(
          "OUT_OF_STOCK",
          `${product.title} is sold out in size ${item.size}.`,
        );
      }

      return {
        productId: product._id,
        productSlug: product.slug,
        productTitle: product.title,
        quantity: item.quantity,
        size: item.size,
        unitPrice: product.sellingPrice,
        lineTotal: product.sellingPrice * item.quantity,
      };
    });

    const subtotal = snapshots.reduce((total, item) => total + item.lineTotal, 0);

    let couponId: Id<"coupons"> | undefined;
    let couponCode: string | undefined;
    let discountAmount = 0;

    const normalizedCouponCode = args.couponCode
      ? normalizeCouponCode(args.couponCode)
      : undefined;

    if (normalizedCouponCode) {
      const coupon = await ctx.db
        .query("coupons")
        .withIndex("by_code", (q) => q.eq("code", normalizedCouponCode))
        .unique();

      if (!coupon || !coupon.isActive) {
        throw appError("INVALID_COUPON", "Coupon code is invalid.");
      }

      if (coupon.expiresAt && coupon.expiresAt < Date.now()) {
        throw appError("INVALID_COUPON", "Coupon code has expired.");
      }

      if (coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit) {
        throw appError("INVALID_COUPON", "Coupon usage limit has been reached.");
      }

      if (subtotal < coupon.minOrderValue) {
        throw appError(
          "INVALID_COUPON",
          `Coupon requires an order value of ₹${coupon.minOrderValue} or more.`,
        );
      }

      couponId = coupon._id;
      couponCode = coupon.code;
      discountAmount = computeDiscount(coupon, subtotal);
    }

    const totalAmount = computeOrderTotal(subtotal, discountAmount);
    const now = Date.now();

    const orderId = await ctx.db.insert("orders", {
      userId: user._id,
      totalAmount,
      discountAmount,
      currency: ORDER_CURRENCY,
      couponId,
      couponCode,
      status: "pending",
      paymentStatus: "pending",
      shippingAddress: args.shippingAddress,
      items: snapshots,
      createdAt: now,
      updatedAt: now,
    });

    await recordOrderEvent(ctx, {
      orderId,
      type: "order_created",
      actor: "customer",
      message: "Pending order created.",
      metadata: { checkoutMode: "signed_in", totalAmount },
    });

    return {
      orderId,
      totalAmount,
      discountAmount,
      currency: ORDER_CURRENCY,
    };
  },
});

export const markPaymentFailure = mutation({
  args: {
    orderId: v.id("orders"),
    guestAccessToken: v.optional(v.string()),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const order = await ctx.db.get("orders", args.orderId);

    if (
      !order ||
      !(await canAccessOrder({
        order,
        userId,
        guestAccessToken: args.guestAccessToken,
      }))
    ) {
      throw appError("FORBIDDEN", "Order not found.");
    }

    const transition = resolveFailureTransition(order);
    if (transition.action !== "noop") {
      await ctx.db.patch(args.orderId, {
        paymentStatus: "failed",
        paymentFailureReason: args.reason,
        updatedAt: Date.now(),
      });
    }

    return await ctx.db.get("orders", args.orderId);
  },
});

export const updateStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: orderStatusValidator,
  },
  handler: async (ctx, args) => {
    await requireAnyRole(ctx, ["super_admin", "admin"]);
    const order = await ctx.db.get(args.orderId);

    if (!order) {
      throw appError("NOT_FOUND", "Order not found.");
    }

    await ctx.db.patch(args.orderId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    await recordOrderEvent(ctx, {
      orderId: args.orderId,
      type: "order_status_updated",
      actor: "admin",
      message: `Order status updated to ${args.status}.`,
      metadata: { status: args.status },
    });

    return await ctx.db.get(args.orderId);
  },
});

export const createCheckoutSession = action({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args): Promise<CheckoutSessionResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw appError("UNAUTHENTICATED", "You must sign in to continue.");
    }

    const order: OrderDoc | null = await ctx.runQuery(internal.orders.getForAction, {
      orderId: args.orderId,
    });

    if (!order || order.userId !== userId) {
      throw appError("FORBIDDEN", "You do not have access to this order.");
    }

    if (order.paymentStatus === "captured") {
      return {
        mode: "existing",
        orderId: order._id,
        razorpayOrderId: order.razorpayOrderId,
      };
    }

    const checkout = await createRazorpayOrder({
      amount: order.totalAmount,
      currency: order.currency,
      receipt: `${order._id}`,
      notes: {
        orderId: `${order._id}`,
      },
    });

    await ctx.runMutation(internal.orders.attachRazorpayOrder, {
      orderId: order._id,
      razorpayOrderId: checkout.razorpayOrderId,
    });

    return checkout;
  },
});

export const verifyPayment = action({
  args: {
    orderId: v.id("orders"),
    guestAccessToken: v.optional(v.string()),
    razorpayOrderId: v.string(),
    razorpayPaymentId: v.string(),
    razorpaySignature: v.string(),
  },
  handler: async (ctx, args): Promise<VerifyPaymentResult> => {
    const userId = await getAuthUserId(ctx);

    const order: OrderDoc | null = await ctx.runQuery(internal.orders.getForAction, {
      orderId: args.orderId,
    });

    if (
      !order ||
      !(await canAccessOrder({
        order,
        userId,
        guestAccessToken: args.guestAccessToken,
      }))
    ) {
      throw appError("FORBIDDEN", "You do not have access to this order.");
    }

    const valid = await verifyCheckoutSignature({
      razorpayOrderId: args.razorpayOrderId,
      razorpayPaymentId: args.razorpayPaymentId,
      razorpaySignature: args.razorpaySignature,
    });

    if (!valid) {
      await ctx.runMutation(internal.orders.markPaymentFailedInternal, {
        orderId: args.orderId,
        reason: "Invalid Razorpay signature.",
      });

      return {
        ok: false,
      };
    }

    const razorpayOrder: Awaited<ReturnType<typeof fetchRazorpayOrderDetails>> =
      await fetchRazorpayOrderDetails(args.razorpayOrderId).catch(() => ({}));
    const shippingAddress = mapMagicAddress(
      razorpayOrder.customerDetails?.shippingAddress,
    );

    const markPaidResult = (await ctx.runMutation(
      internal.orders.markPaidInternal,
      {
        orderId: args.orderId,
        razorpayOrderId: args.razorpayOrderId,
        razorpayPaymentId: args.razorpayPaymentId,
        customerEmail: razorpayOrder.customerDetails?.email,
        customerPhone: razorpayOrder.customerDetails?.contact,
        customerName: shippingAddress?.fullName,
        shippingAddress,
      },
    )) as MarkPaidResult;

    if (markPaidResult.shipmentRequired) {
      await ctx.runAction(internal.shipping.createShipmentForPaidOrder, {
        orderId: args.orderId,
      });
    }

    return {
      ok: true,
      paymentResult: markPaidResult.order,
    };
  },
});

export const syncRazorpayOrder = action({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw appError("UNAUTHENTICATED", "You must sign in to continue.");
    }

    const actor = await ctx.runQuery(internal.users.getByIdInternal, {
      userId,
    });

    if (!actor || !["super_admin", "admin"].includes(actor.role)) {
      throw appError("FORBIDDEN", "You do not have access to payment sync.");
    }

    const order: OrderDoc | null = await ctx.runQuery(internal.orders.getForAction, {
      orderId: args.orderId,
    });

    if (!order?.razorpayOrderId) {
      return {
        ok: false,
        message: "No Razorpay order is attached yet.",
      };
    }

    const payments = await fetchRazorpayOrderPayments(order.razorpayOrderId);
    const capturedPayment = findCapturedPayment(payments);

    if (capturedPayment) {
      const razorpayOrder = await fetchRazorpayOrderDetails(order.razorpayOrderId);
      const shippingAddress = mapMagicAddress(
        razorpayOrder.customerDetails?.shippingAddress,
      );
      const markPaidResult = (await ctx.runMutation(
        internal.orders.markPaidInternal,
        {
          orderId: args.orderId,
          razorpayOrderId: order.razorpayOrderId,
          razorpayPaymentId: capturedPayment.id,
          customerEmail: razorpayOrder.customerDetails?.email,
          customerPhone: razorpayOrder.customerDetails?.contact,
          customerName: shippingAddress?.fullName,
          shippingAddress,
        },
      )) as MarkPaidResult;

      if (markPaidResult.shipmentRequired) {
        await ctx.runAction(internal.shipping.createShipmentForPaidOrder, {
          orderId: args.orderId,
        });
      }

      return {
        ok: true,
        message: `Synced captured payment ${capturedPayment.id}.`,
        payments,
      };
    }

    const failedPayment = payments.find((payment) => payment.status === "failed");
    if (failedPayment) {
      await ctx.runMutation(internal.orders.markPaymentFailedInternal, {
        orderId: args.orderId,
        reason:
          failedPayment.errorDescription ??
          "Razorpay sync found a failed payment attempt.",
      });

      return {
        ok: true,
        message: `Synced failed payment ${failedPayment.id}.`,
        payments,
      };
    }

    return {
      ok: true,
      message: payments.length
        ? "Razorpay order has no captured payment yet."
        : "Razorpay order has no payment attempts yet.",
      payments,
    };
  },
});

export const getForAction = internalQuery({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get("orders", args.orderId);
  },
});

export const findByRazorpayOrderId = internalQuery({
  args: {
    razorpayOrderId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_razorpay_order", (q) =>
        q.eq("razorpayOrderId", args.razorpayOrderId),
      )
      .unique();
  },
});

export const attachRazorpayOrder = internalMutation({
  args: {
    orderId: v.id("orders"),
    razorpayOrderId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      razorpayOrderId: args.razorpayOrderId,
      updatedAt: Date.now(),
    });
    await recordOrderEvent(ctx, {
      orderId: args.orderId,
      type: "razorpay_order_attached",
      actor: "provider",
      message: "Razorpay order attached.",
      metadata: { razorpayOrderId: args.razorpayOrderId },
    });
    return await ctx.db.get("orders", args.orderId);
  },
});

export const createMagicPendingInternal = internalMutation({
  args: {
    items: v.array(orderItemInputValidator),
    couponCode: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    guestAccessTokenHash: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    customerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const pricing = await priceCheckoutItems(ctx, args);
    const now = Date.now();
    const orderId = await ctx.db.insert("orders", {
      userId: args.userId,
      checkoutMode: args.userId ? "signed_in" : "guest_magic",
      customerEmail: args.customerEmail,
      customerPhone: args.customerPhone,
      customerName: args.customerName,
      guestAccessTokenHash: args.guestAccessTokenHash,
      totalAmount: pricing.totalAmount,
      discountAmount: pricing.discountAmount,
      currency: ORDER_CURRENCY,
      couponId: pricing.couponId,
      couponCode: pricing.couponCode,
      status: "pending",
      paymentStatus: "pending",
      items: pricing.items,
      createdAt: now,
      updatedAt: now,
    });

    await recordOrderEvent(ctx, {
      orderId,
      type: "order_created",
      actor: args.userId ? "customer" : "system",
      message: "Pending Magic Checkout order created.",
      metadata: {
        checkoutMode: args.userId ? "signed_in" : "guest_magic",
        totalAmount: pricing.totalAmount,
      },
    });

    return {
      orderId,
      totalAmount: pricing.totalAmount,
      discountAmount: pricing.discountAmount,
      currency: ORDER_CURRENCY,
      items: pricing.items,
    };
  },
});

export const createStandardPendingInternal = internalMutation({
  args: {
    items: v.array(orderItemInputValidator),
    shippingAddress: shippingAddressValidator,
    couponCode: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    guestAccessTokenHash: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    customerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    validateOrderItemsForCheckout(args.items);

    const products = await Promise.all(
      args.items.map((item) => ctx.db.get("products", item.productId)),
    );

    const snapshots = args.items.map((item, index) => {
      const product = products[index];
      if (!product || !product.isPublished) {
        throw appError("NOT_FOUND", "One or more products are unavailable.");
      }

      if (item.quantity > product.inventoryCount) {
        throw appError(
          "OUT_OF_STOCK",
          `${product.title} does not have enough inventory.`,
        );
      }

      if (item.size && product.soldOutSizes.includes(item.size)) {
        throw appError(
          "OUT_OF_STOCK",
          `${product.title} is sold out in size ${item.size}.`,
        );
      }

      return {
        productId: product._id,
        productSlug: product.slug,
        productTitle: product.title,
        quantity: item.quantity,
        size: item.size,
        unitPrice: product.sellingPrice,
        lineTotal: product.sellingPrice * item.quantity,
      };
    });

    const subtotal = snapshots.reduce((total, item) => total + item.lineTotal, 0);
    let couponId: Id<"coupons"> | undefined;
    let couponCode: string | undefined;
    let discountAmount = 0;
    const normalizedCouponCode = args.couponCode
      ? normalizeCouponCode(args.couponCode)
      : undefined;

    if (normalizedCouponCode) {
      const coupon = await ctx.db
        .query("coupons")
        .withIndex("by_code", (q) => q.eq("code", normalizedCouponCode))
        .unique();

      if (!coupon || !coupon.isActive) {
        throw appError("INVALID_COUPON", "Coupon code is invalid.");
      }

      if (coupon.expiresAt && coupon.expiresAt < Date.now()) {
        throw appError("INVALID_COUPON", "Coupon code has expired.");
      }

      if (coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit) {
        throw appError("INVALID_COUPON", "Coupon usage limit has been reached.");
      }

      if (subtotal < coupon.minOrderValue) {
        throw appError(
          "INVALID_COUPON",
          `Coupon requires an order value of ₹${coupon.minOrderValue} or more.`,
        );
      }

      couponId = coupon._id;
      couponCode = coupon.code;
      discountAmount = computeDiscount(coupon, subtotal);
    }

    const totalAmount = computeOrderTotal(subtotal, discountAmount);
    const now = Date.now();
    const orderId = await ctx.db.insert("orders", {
      userId: args.userId,
      checkoutMode: args.userId ? "signed_in" : "guest_standard",
      customerEmail: args.customerEmail,
      customerPhone: args.customerPhone,
      customerName: args.customerName,
      guestAccessTokenHash: args.guestAccessTokenHash,
      totalAmount,
      discountAmount,
      currency: ORDER_CURRENCY,
      couponId,
      couponCode,
      status: "pending",
      paymentStatus: "pending",
      shippingAddress: args.shippingAddress,
      items: snapshots,
      createdAt: now,
      updatedAt: now,
    });

    await recordOrderEvent(ctx, {
      orderId,
      type: "order_created",
      actor: args.userId ? "customer" : "system",
      message: "Pending standard checkout order created.",
      metadata: {
        checkoutMode: args.userId ? "signed_in" : "guest_standard",
        totalAmount,
      },
    });

    return {
      orderId,
      totalAmount,
      discountAmount,
      currency: ORDER_CURRENCY,
      items: snapshots,
    };
  },
});

export const markPaymentFailedInternal = internalMutation({
  args: {
    orderId: v.id("orders"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get("orders", args.orderId);
    if (!order) {
      return null;
    }

    const transition = resolveFailureTransition(order);
    if (transition.action === "noop") {
      return await ctx.db.get("orders", args.orderId);
    }

    await ctx.db.patch(args.orderId, {
      paymentStatus: "failed",
      paymentFailureReason: args.reason,
      updatedAt: Date.now(),
    });

    await recordOrderEvent(ctx, {
      orderId: args.orderId,
      type: "payment_failed",
      actor: "provider",
      message: "Payment marked failed.",
      metadata: { reason: args.reason },
    });

    return await ctx.db.get("orders", args.orderId);
  },
});

export const markPaidInternal = internalMutation({
  args: {
    orderId: v.id("orders"),
    razorpayOrderId: v.optional(v.string()),
    razorpayPaymentId: v.string(),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    customerName: v.optional(v.string()),
    shippingAddress: v.optional(shippingAddressValidator),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get("orders", args.orderId);
    if (!order) {
      throw appError("NOT_FOUND", "Order not found.");
    }

    const transition = resolveCaptureTransition(order, args.razorpayPaymentId);

    if (transition.action === "conflict") {
      throw appError("PAYMENT_CONFLICT", transition.reason);
    }

    if (transition.action === "noop") {
      return {
        ok: true,
        order,
        shipmentRequired: false,
      };
    }

    if (transition.action !== "capture") {
      throw appError("PAYMENT_CONFLICT", "Payment cannot be captured.");
    }

    const now = Date.now();
    const reviewMetadata = {
      razorpayPaymentId: args.razorpayPaymentId,
      razorpayOrderId: args.razorpayOrderId ?? order.razorpayOrderId ?? null,
    };

    try {
      for (const item of order.items) {
        const product = await ctx.db.get("products", item.productId);
        if (!product) {
          throw new Error(`${item.productTitle} is no longer available.`);
        }

        assertInventoryAvailable({
          productTitle: product.title,
          requestedQuantity: item.quantity,
          inventoryCount: product.inventoryCount,
        });
      }

      if (order.couponId) {
        const coupon = await ctx.db.get("coupons", order.couponId);
        if (!coupon || !isCouponUsableAtCapture(coupon, now)) {
          throw new Error("Coupon is no longer available for this payment.");
        }
      }
    } catch (error) {
      const reason =
        error instanceof Error
          ? error.message
          : "Payment captured but order requires support review.";

      await ctx.db.patch(args.orderId, {
        status: "requires_review",
        paymentStatus: "captured",
        razorpayOrderId: args.razorpayOrderId ?? order.razorpayOrderId,
        razorpayPaymentId: args.razorpayPaymentId,
        customerEmail: args.customerEmail ?? order.customerEmail,
        customerPhone: args.customerPhone ?? order.customerPhone,
        customerName: args.customerName ?? order.customerName,
        shippingAddress: args.shippingAddress ?? order.shippingAddress,
        paymentFailureReason: reason,
        paidAt: now,
        updatedAt: now,
      });

      await recordOrderEvent(ctx, {
        orderId: args.orderId,
        type: "payment_captured_requires_review",
        actor: "provider",
        message: "Payment captured but order requires support review.",
        metadata: { ...reviewMetadata, reason },
      });
      logWarn("payment_captured_requires_review", {
        orderId: `${args.orderId}`,
        reason,
      });

      return {
        ok: true as const,
        order: await ctx.db.get("orders", args.orderId),
        shipmentRequired: false,
      };
    }

    await ctx.db.patch(args.orderId, {
      status: "paid",
      paymentStatus: "captured",
      razorpayOrderId: args.razorpayOrderId ?? order.razorpayOrderId,
      razorpayPaymentId: args.razorpayPaymentId,
      customerEmail: args.customerEmail ?? order.customerEmail,
      customerPhone: args.customerPhone ?? order.customerPhone,
      customerName: args.customerName ?? order.customerName,
      shippingAddress: args.shippingAddress ?? order.shippingAddress,
      paymentFailureReason: undefined,
      paidAt: now,
      updatedAt: now,
    });

    for (const item of order.items) {
      const product = await ctx.db.get("products", item.productId);
      if (!product) {
        continue;
      }

      await ctx.db.patch(item.productId, {
        inventoryCount: decrementInventoryCount(
          product.inventoryCount,
          item.quantity,
        ),
        updatedAt: now,
      });
    }

    if (order.couponId) {
      const coupon = await ctx.db.get("coupons", order.couponId);
      if (coupon) {
        await ctx.db.patch(order.couponId, {
          usedCount: coupon.usedCount + 1,
          updatedAt: now,
        });
      }
    }

    await recordOrderEvent(ctx, {
      orderId: args.orderId,
      type: "payment_captured",
      actor: "provider",
      message: "Payment captured and order marked paid.",
      metadata: reviewMetadata,
    });
    logInfo("payment_captured", {
      orderId: `${args.orderId}`,
      razorpayPaymentId: args.razorpayPaymentId,
    });

    return {
      ok: true as const,
      order: await ctx.db.get("orders", args.orderId),
      shipmentRequired: transition.shouldCreateShipment,
    };
  },
});

export const updateShippingStateInternal = internalMutation({
  args: {
    orderId: v.id("orders"),
    status: v.optional(v.union(v.literal("processing"), v.literal("shipped"), v.literal("delivered"))),
    shiprocketOrderId: v.optional(v.string()),
    shiprocketShipmentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get("orders", args.orderId);
    if (!order) {
      return null;
    }

    await ctx.db.patch(args.orderId, {
      status: args.status ?? order.status,
      shiprocketOrderId: args.shiprocketOrderId ?? order.shiprocketOrderId,
      shiprocketShipmentId:
        args.shiprocketShipmentId ?? order.shiprocketShipmentId,
      updatedAt: Date.now(),
    });

    await recordOrderEvent(ctx, {
      orderId: args.orderId,
      type: "shipment_state_updated",
      actor: "provider",
      message: "Shipment state updated.",
      metadata: {
        status: args.status ?? order.status,
        shiprocketOrderId: args.shiprocketOrderId ?? null,
        shiprocketShipmentId: args.shiprocketShipmentId ?? null,
      },
    });

    return await ctx.db.get("orders", args.orderId);
  },
});
