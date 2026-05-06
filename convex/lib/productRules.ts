export function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function validateProductInput(input: {
  slug: string;
  mrp: number;
  sellingPrice: number;
  inventoryCount: number;
  images: string[];
  isPublished: boolean;
  sizes: string[];
  soldOutSizes: string[];
}) {
  if (input.slug !== normalizeSlug(input.slug)) {
    return "Product slug must be normalized.";
  }

  if (input.mrp < 0 || input.sellingPrice < 0 || input.inventoryCount < 0) {
    return "Product prices and inventory cannot be negative.";
  }

  if (input.sellingPrice > input.mrp) {
    return "Selling price cannot exceed MRP.";
  }

  if (input.isPublished && input.images.length === 0) {
    return "Published products require at least one image.";
  }

  const sizeSet = new Set(input.sizes);
  const invalidSoldOutSize = input.soldOutSizes.find((size) => !sizeSet.has(size));
  if (invalidSoldOutSize) {
    return `Sold-out size ${invalidSoldOutSize} must exist in sizes.`;
  }

  const oversizedDataUrl = input.images.find(
    (image) => image.startsWith("data:") && image.length > 250_000,
  );
  if (oversizedDataUrl) {
    return "Product images must be uploaded to storage before saving.";
  }

  return undefined;
}
