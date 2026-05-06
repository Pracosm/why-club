import { describe, expect, it } from "vitest";
import { normalizeCouponCode, validateCouponInput } from "./couponRules";

describe("coupon rules", () => {
  it("normalizes coupon codes", () => {
    expect(normalizeCouponCode(" save10 ")).toBe("SAVE10");
  });

  it("validates percentage discounts", () => {
    expect(
      validateCouponInput({
        discountType: "percentage",
        discountValue: 101,
        minOrderValue: 0,
      }),
    ).toBe("Percentage discount must be between 1 and 100.");
  });

  it("validates fixed discounts", () => {
    expect(
      validateCouponInput({
        discountType: "fixed",
        discountValue: 0,
        minOrderValue: 0,
      }),
    ).toBe("Fixed discount must be greater than zero.");
  });

  it("rejects negative minimum order values", () => {
    expect(
      validateCouponInput({
        discountType: "fixed",
        discountValue: 10,
        minOrderValue: -1,
      }),
    ).toBe("Minimum order value cannot be negative.");
  });

  it("rejects non-positive usage limits", () => {
    expect(
      validateCouponInput({
        discountType: "fixed",
        discountValue: 10,
        minOrderValue: 0,
        usageLimit: 0,
      }),
    ).toBe("Usage limit must be greater than zero.");
  });
});
