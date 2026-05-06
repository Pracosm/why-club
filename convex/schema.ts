import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  discountTypeValidator,
  checkoutModeValidator,
  orderItemSnapshotValidator,
  orderStatusValidator,
  paymentStatusValidator,
  productBadgeValidator,
  roleValidator,
  shippingAddressValidator,
} from "./lib/validators";

const { users: _authUsersTable, ...authOnlyTables } = authTables;
void _authUsersTable;

export default defineSchema({
  ...authOnlyTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    tokenIdentifier: v.optional(v.string()),
    role: roleValidator,
    phoneNumber: v.optional(v.string()),
    shippingAddress: v.optional(shippingAddressValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastSeenAt: v.optional(v.number()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_role", ["role"])
    .index("by_token_identifier", ["tokenIdentifier"]),
  collections: defineTable({
    title: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_active", ["isActive"]),
  products: defineTable({
    collectionId: v.optional(v.id("collections")),
    title: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    mrp: v.number(),
    sellingPrice: v.number(),
    inventoryCount: v.number(),
    images: v.array(v.string()),
    hsnCode: v.optional(v.string()),
    isPublished: v.boolean(),
    badge: v.optional(productBadgeValidator),
    tags: v.array(v.string()),
    sizes: v.array(v.string()),
    soldOutSizes: v.array(v.string()),
    fit: v.optional(v.string()),
    material: v.optional(v.string()),
    weightGsm: v.optional(v.number()),
    story: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_collection", ["collectionId"])
    .index("by_published", ["isPublished"]),
  coupons: defineTable({
    code: v.string(),
    title: v.optional(v.string()),
    discountType: discountTypeValidator,
    discountValue: v.number(),
    minOrderValue: v.number(),
    usageLimit: v.optional(v.number()),
    usedCount: v.number(),
    expiresAt: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_active", ["isActive"]),
  orders: defineTable({
    userId: v.optional(v.id("users")),
    checkoutMode: v.optional(checkoutModeValidator),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    customerName: v.optional(v.string()),
    guestAccessTokenHash: v.optional(v.string()),
    guestClaimedAt: v.optional(v.number()),
    totalAmount: v.number(),
    discountAmount: v.number(),
    currency: v.string(),
    couponId: v.optional(v.id("coupons")),
    couponCode: v.optional(v.string()),
    status: orderStatusValidator,
    paymentStatus: paymentStatusValidator,
    shippingAddress: v.optional(shippingAddressValidator),
    razorpayOrderId: v.optional(v.string()),
    razorpayPaymentId: v.optional(v.string()),
    shiprocketOrderId: v.optional(v.string()),
    shiprocketShipmentId: v.optional(v.string()),
    items: v.array(orderItemSnapshotValidator),
    paymentFailureReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    paidAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"])
    .index("by_customer_email", ["customerEmail"])
    .index("by_razorpay_order", ["razorpayOrderId"])
    .index("by_razorpay_payment", ["razorpayPaymentId"])
    .index("by_status", ["status"])
    .index("by_payment_status", ["paymentStatus"])
    .index("by_status_and_created_at", ["status", "createdAt"])
    .index("by_created_at", ["createdAt"]),
  orderEvents: defineTable({
    orderId: v.id("orders"),
    type: v.string(),
    actor: v.union(
      v.literal("system"),
      v.literal("customer"),
      v.literal("admin"),
      v.literal("provider"),
    ),
    message: v.string(),
    metadata: v.optional(
      v.record(v.string(), v.union(v.string(), v.number(), v.boolean(), v.null())),
    ),
    createdAt: v.number(),
  }).index("by_order", ["orderId"]),
  shippingUpdates: defineTable({
    orderId: v.id("orders"),
    awbCode: v.optional(v.string()),
    courierName: v.optional(v.string()),
    trackingStatus: v.string(),
    location: v.optional(v.string()),
    trackedAt: v.number(),
  })
    .index("by_order", ["orderId"])
    .index("by_awb", ["awbCode"]),
  webhookEvents: defineTable({
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
    createdAt: v.number(),
  })
    .index("by_provider_event", ["provider", "eventId"])
    .index("by_payload_hash", ["payloadHash"])
    .index("by_order", ["orderId"]),
  developerFeatureFlags: defineTable({
    key: v.string(),
    enabled: v.boolean(),
    updatedBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
  authRateLimits: defineTable({
    key: v.string(),
    count: v.number(),
    resetAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_reset_at", ["resetAt"]),
  reviews: defineTable({
    productId: v.id("products"),
    userId: v.id("users"),
    authorName: v.optional(v.string()),
    rating: v.number(),
    comment: v.optional(v.string()),
    location: v.optional(v.string()),
    isApproved: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_product", ["productId"])
    .index("by_product_and_user", ["productId", "userId"])
    .index("by_approval", ["isApproved"]),
  otpVerifications: defineTable({
    email: v.string(),
    codeHash: v.string(),
    attempts: v.number(),
    expiresAt: v.number(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),
});
