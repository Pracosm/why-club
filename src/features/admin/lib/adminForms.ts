import type {
  CollectionDoc,
  CollectionFormState,
  CouponDoc,
  CouponFormState,
  ProductDoc,
  ProductFormState,
} from "../types";

export const EMPTY_PRODUCT_FORM: ProductFormState = {
  title: "",
  slug: "",
  collectionId: "",
  description: "",
  mrp: "",
  sellingPrice: "",
  inventoryCount: "",
  images: "",
  hsnCode: "",
  isPublished: true,
  badge: "",
  tags: "",
  sizes: "S, M, L, XL",
  soldOutSizes: "",
  fit: "Regular Fit",
  material: "100% Cotton",
  weightGsm: "240",
  story: "",
};

export const EMPTY_COLLECTION_FORM: CollectionFormState = {
  title: "",
  slug: "",
  description: "",
  imageUrl: "",
  isActive: true,
};

export const EMPTY_COUPON_FORM: CouponFormState = {
  code: "",
  title: "",
  discountType: "percentage",
  discountValue: "10",
  minOrderValue: "0",
  usageLimit: "",
  expiresAt: "",
  isActive: true,
};

export function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function splitList(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function optionalString(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parseNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function productToForm(product: ProductDoc): ProductFormState {
  return {
    title: product.title,
    slug: product.slug,
    collectionId: product.collectionId ?? "",
    description: product.description ?? "",
    mrp: String(product.mrp),
    sellingPrice: String(product.sellingPrice),
    inventoryCount: String(product.inventoryCount),
    images: product.images.join("\n"),
    hsnCode: product.hsnCode ?? "",
    isPublished: product.isPublished,
    badge: product.badge ?? "",
    tags: product.tags.join(", "),
    sizes: product.sizes.join(", "),
    soldOutSizes: product.soldOutSizes.join(", "),
    fit: product.fit ?? "",
    material: product.material ?? "",
    weightGsm: product.weightGsm ? String(product.weightGsm) : "",
    story: product.story ?? "",
  };
}

export function collectionToForm(collection: CollectionDoc): CollectionFormState {
  return {
    title: collection.title,
    slug: collection.slug,
    description: collection.description ?? "",
    imageUrl: collection.imageUrl ?? "",
    isActive: collection.isActive,
  };
}

export function couponToForm(coupon: CouponDoc): CouponFormState {
  return {
    code: coupon.code,
    title: coupon.title ?? "",
    discountType: coupon.discountType,
    discountValue: String(coupon.discountValue),
    minOrderValue: String(coupon.minOrderValue),
    usageLimit: coupon.usageLimit === undefined ? "" : String(coupon.usageLimit),
    expiresAt: coupon.expiresAt
      ? new Date(coupon.expiresAt).toISOString().slice(0, 10)
      : "",
    isActive: coupon.isActive,
  };
}

export function productFormToPayload(form: ProductFormState) {
  return {
    title: form.title.trim(),
    slug: normalizeSlug(form.slug || form.title),
    description: optionalString(form.description),
    mrp: parseNumber(form.mrp),
    sellingPrice: parseNumber(form.sellingPrice),
    inventoryCount: parseNumber(form.inventoryCount),
    images: splitList(form.images),
    hsnCode: optionalString(form.hsnCode),
    isPublished: form.isPublished,
    badge: form.badge || undefined,
    tags: splitList(form.tags),
    sizes: splitList(form.sizes),
    soldOutSizes: splitList(form.soldOutSizes),
    fit: optionalString(form.fit),
    material: optionalString(form.material),
    weightGsm: form.weightGsm ? parseNumber(form.weightGsm) : undefined,
    story: optionalString(form.story),
  };
}

export function collectionFormToPayload(form: CollectionFormState) {
  return {
    title: form.title.trim(),
    slug: normalizeSlug(form.slug || form.title),
    description: optionalString(form.description),
    imageUrl: optionalString(form.imageUrl),
    isActive: form.isActive,
  };
}

export function couponFormToPayload(form: CouponFormState) {
  return {
    title: optionalString(form.title),
    discountType: form.discountType,
    discountValue: parseNumber(form.discountValue),
    minOrderValue: parseNumber(form.minOrderValue),
    usageLimit: form.usageLimit ? parseNumber(form.usageLimit) : undefined,
    expiresAt: form.expiresAt ? new Date(form.expiresAt).getTime() : undefined,
    isActive: form.isActive,
  };
}
