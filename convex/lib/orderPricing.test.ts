import { describe, expect, it } from "vitest";
import { computeDiscount, computeOrderTotal } from "./orderPricing";

describe("order pricing helpers", () => {
  it("rounds percentage discounts", () => {
    expect(
      computeDiscount({ discountType: "percentage", discountValue: 12.5 }, 999),
    ).toBe(125);
  });

  it("caps fixed discounts at subtotal", () => {
    expect(computeDiscount({ discountType: "fixed", discountValue: 500 }, 399)).toBe(
      399,
    );
  });

  it("never returns a negative total", () => {
    expect(computeOrderTotal(300, 500)).toBe(0);
  });
});
