import { describe, expect, it } from "vitest";
import { assertInventoryAvailable, decrementInventoryCount } from "./inventory";

describe("inventory helpers", () => {
  it("passes sufficient inventory", () => {
    expect(() =>
      assertInventoryAvailable({
        productTitle: "Star Tee",
        requestedQuantity: 2,
        inventoryCount: 3,
      }),
    ).not.toThrow();
  });

  it("includes product title in insufficient inventory failures", () => {
    expect(() =>
      assertInventoryAvailable({
        productTitle: "Star Tee",
        requestedQuantity: 4,
        inventoryCount: 3,
      }),
    ).toThrow("Star Tee does not have enough inventory.");
  });

  it("does not allow negative inventory", () => {
    expect(() => decrementInventoryCount(1, 2)).toThrow(
      "Inventory cannot be negative.",
    );
    expect(decrementInventoryCount(5, 2)).toBe(3);
  });
});
