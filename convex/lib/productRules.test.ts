import { describe, expect, it } from "vitest";
import { normalizeSlug, validateProductInput } from "./productRules";

const validProduct = {
  slug: "star-tee",
  mrp: 1200,
  sellingPrice: 999,
  inventoryCount: 10,
  images: ["/images/star.webp"],
  isPublished: true,
  sizes: ["S", "M"],
  soldOutSizes: ["S"],
};

describe("product rules", () => {
  it("normalizes slugs", () => {
    expect(normalizeSlug(" Star Tee!! ")).toBe("star-tee");
    expect(validateProductInput({ ...validProduct, slug: "Star Tee" })).toBe(
      "Product slug must be normalized.",
    );
  });

  it("rejects negative pricing or inventory", () => {
    expect(validateProductInput({ ...validProduct, mrp: -1 })).toBe(
      "Product prices and inventory cannot be negative.",
    );
  });

  it("rejects selling price above MRP", () => {
    expect(validateProductInput({ ...validProduct, sellingPrice: 1300 })).toBe(
      "Selling price cannot exceed MRP.",
    );
  });

  it("requires images when published", () => {
    expect(validateProductInput({ ...validProduct, images: [] })).toBe(
      "Published products require at least one image.",
    );
  });

  it("requires sold-out sizes to exist in sizes", () => {
    expect(validateProductInput({ ...validProduct, soldOutSizes: ["XL"] })).toBe(
      "Sold-out size XL must exist in sizes.",
    );
  });
});
