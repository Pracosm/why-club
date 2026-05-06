import { describe, expect, it } from "vitest";
import {
  couponFormToPayload,
  normalizeSlug,
  optionalString,
  parseNumber,
  splitList,
} from "./adminForms";

describe("admin form helpers", () => {
  it("normalizes slugs", () => {
    expect(normalizeSlug("  Why Club: Drop #01  ")).toBe("why-club-drop-01");
  });

  it("splits comma and newline lists while removing blanks", () => {
    expect(splitList("S, M\n\nL,XL ")).toEqual(["S", "M", "L", "XL"]);
  });

  it("returns undefined for blank optional strings", () => {
    expect(optionalString("   ")).toBeUndefined();
    expect(optionalString(" Cotton ")).toBe("Cotton");
  });

  it("falls back when number parsing is invalid", () => {
    expect(parseNumber("42")).toBe(42);
    expect(parseNumber("not-a-number", 7)).toBe(7);
  });

  it("parses coupon expiry dates into timestamps", () => {
    expect(couponFormToPayload({
      code: "DROP10",
      title: "",
      discountType: "percentage",
      discountValue: "10",
      minOrderValue: "999",
      usageLimit: "",
      expiresAt: "2026-06-15",
      isActive: true,
    })).toMatchObject({
      discountValue: 10,
      minOrderValue: 999,
      usageLimit: undefined,
      expiresAt: new Date("2026-06-15").getTime(),
    });
  });
});
