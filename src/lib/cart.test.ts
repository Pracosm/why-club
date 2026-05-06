import { describe, expect, it } from "vitest";
import {
  countCartItems,
  parseCart,
  replaceCartItemQuantity,
  updateCartQuantity,
} from "./cart";

describe("cart helpers", () => {
  it("drops invalid persisted cart entries", () => {
    expect(parseCart([{ productSlug: "tee", size: "M", quantity: 1 }])).toEqual([
      { productSlug: "tee", size: "M", quantity: 1 },
    ]);
    expect(parseCart([{ productSlug: "", size: "M", quantity: 1 }])).toEqual([]);
  });

  it("caps merged quantities at the configured maximum", () => {
    const cart = updateCartQuantity(
      [{ productSlug: "tee", size: "M", quantity: 8 }],
      { productSlug: "tee", size: "M", quantity: 5 },
      10,
    );

    expect(cart).toEqual([{ productSlug: "tee", size: "M", quantity: 10 }]);
  });

  it("removes items when replacement quantity is zero", () => {
    const cart = replaceCartItemQuantity(
      [{ productSlug: "tee", size: "M", quantity: 1 }],
      { productSlug: "tee", size: "M" },
      0,
    );

    expect(cart).toEqual([]);
  });

  it("counts all quantities", () => {
    expect(
      countCartItems([
        { productSlug: "tee", size: "M", quantity: 2 },
        { productSlug: "hoodie", size: "L", quantity: 3 },
      ]),
    ).toBe(5);
  });
});
