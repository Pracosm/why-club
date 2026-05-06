import { v } from "convex/values";

export const roleValidator = v.union(
  v.literal("super_admin"),
  v.literal("admin"),
  v.literal("editor"),
  v.literal("customer"),
);

export const discountTypeValidator = v.union(
  v.literal("percentage"),
  v.literal("fixed"),
);

export const orderStatusValidator = v.union(
  v.literal("pending"),
  v.literal("paid"),
  v.literal("processing"),
  v.literal("shipped"),
  v.literal("delivered"),
  v.literal("cancelled"),
  v.literal("requires_review"),
);

export const paymentStatusValidator = v.union(
  v.literal("pending"),
  v.literal("authorized"),
  v.literal("captured"),
  v.literal("failed"),
  v.literal("refunded"),
);

export const checkoutModeValidator = v.union(
  v.literal("signed_in"),
  v.literal("guest_magic"),
  v.literal("guest_standard"),
);

export const shippingAddressValidator = v.object({
  fullName: v.string(),
  line1: v.string(),
  line2: v.optional(v.string()),
  city: v.string(),
  state: v.string(),
  postalCode: v.string(),
  country: v.string(),
  phoneNumber: v.string(),
  landmark: v.optional(v.string()),
});

export const orderItemInputValidator = v.object({
  productId: v.id("products"),
  quantity: v.number(),
  size: v.optional(v.string()),
});

export const orderItemSnapshotValidator = v.object({
  productId: v.id("products"),
  productSlug: v.string(),
  productTitle: v.string(),
  quantity: v.number(),
  size: v.optional(v.string()),
  unitPrice: v.number(),
  lineTotal: v.number(),
});

export const productBadgeValidator = v.union(
  v.literal("new"),
  v.literal("sale"),
);

export const collectionSeedValidator = v.object({
  slug: v.string(),
  title: v.string(),
  description: v.string(),
  imageUrl: v.string(),
  isActive: v.boolean(),
});

export const productSeedValidator = v.object({
  slug: v.string(),
  collectionSlug: v.string(),
  title: v.string(),
  description: v.string(),
  mrp: v.number(),
  sellingPrice: v.number(),
  inventoryCount: v.number(),
  images: v.array(v.string()),
  hsnCode: v.string(),
  isPublished: v.boolean(),
  badge: productBadgeValidator,
  tags: v.array(v.string()),
  sizes: v.array(v.string()),
  soldOutSizes: v.array(v.string()),
  fit: v.string(),
  material: v.string(),
  weightGsm: v.number(),
  story: v.string(),
});

export const reviewSeedValidator = v.object({
  productSlug: v.string(),
  author: v.string(),
  rating: v.number(),
  comment: v.string(),
  location: v.string(),
});
