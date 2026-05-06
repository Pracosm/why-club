import { describe, expect, it } from "vitest";
import {
  assertPublicRuntimeConfig,
  getRuntimeMode,
  isProductionMode,
  parseBoolean,
} from "./env";

describe("frontend env helpers", () => {
  it("parses booleans with a fallback", () => {
    expect(parseBoolean(undefined, false)).toBe(false);
    expect(parseBoolean(undefined, true)).toBe(true);
    expect(parseBoolean("true")).toBe(true);
    expect(parseBoolean("false")).toBe(false);
  });

  it("detects production mode from a pure runtime value", () => {
    expect(getRuntimeMode(true)).toBe("production");
    expect(isProductionMode("production")).toBe(true);
    expect(isProductionMode("development")).toBe(false);
  });

  it("allows missing Convex URL in development", () => {
    expect(() =>
      assertPublicRuntimeConfig({ convexUrl: "", mode: "development" }),
    ).not.toThrow();
  });

  it("rejects missing Convex URL in production", () => {
    expect(() =>
      assertPublicRuntimeConfig({ convexUrl: "", mode: "production" }),
    ).toThrow("PUBLIC_CONVEX_URL is required in production.");
  });
});
