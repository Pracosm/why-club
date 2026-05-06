import type { Doc } from "../../../convex/_generated/dataModel";

export type AdminSection =
  | "overview"
  | "products"
  | "collections"
  | "orders"
  | "coupons";

export type ProductDoc = Doc<"products">;
export type CollectionDoc = Doc<"collections">;
export type CouponDoc = Doc<"coupons">;
export type OrderDoc = Doc<"orders">;

export type ProductFormState = {
  title: string;
  slug: string;
  collectionId: string;
  description: string;
  mrp: string;
  sellingPrice: string;
  inventoryCount: string;
  images: string;
  hsnCode: string;
  isPublished: boolean;
  badge: "" | "new" | "sale";
  tags: string;
  sizes: string;
  soldOutSizes: string;
  fit: string;
  material: string;
  weightGsm: string;
  story: string;
};

export type CollectionFormState = {
  title: string;
  slug: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
};

export type CouponFormState = {
  code: string;
  title: string;
  discountType: "percentage" | "fixed";
  discountValue: string;
  minOrderValue: string;
  usageLimit: string;
  expiresAt: string;
  isActive: boolean;
};
