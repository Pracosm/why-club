import { describe, expect, it } from "vitest";
import {
  assertOtpPepper,
  generateOtpCode,
  hashOtpCode,
  normalizeOtpCode,
  safeEqualHex,
} from "./otpCodes";

describe("OTP code helpers", () => {
  it("generates a six digit code", () => {
    expect(generateOtpCode()).toMatch(/^\d{6}$/);
  });

  it("normalizes code whitespace", () => {
    expect(normalizeOtpCode(" 12 3\t4\n56 ")).toBe("123456");
  });

  it("accepts a matching hash", async () => {
    const hash = await hashOtpCode({
      email: "person@example.com",
      code: "123456",
      createdAt: 123,
      pepper: "pepper-a",
    });

    const incomingHash = await hashOtpCode({
      email: "person@example.com",
      code: " 123 456 ",
      createdAt: 123,
      pepper: "pepper-a",
    });

    expect(safeEqualHex(hash, incomingHash)).toBe(true);
  });

  it("rejects an incorrect hash", async () => {
    const hash = await hashOtpCode({
      email: "person@example.com",
      code: "123456",
      createdAt: 123,
      pepper: "pepper-a",
    });

    const incomingHash = await hashOtpCode({
      email: "person@example.com",
      code: "654321",
      createdAt: 123,
      pepper: "pepper-a",
    });

    expect(safeEqualHex(hash, incomingHash)).toBe(false);
  });

  it("changes hash when the pepper changes", async () => {
    const first = await hashOtpCode({
      email: "person@example.com",
      code: "123456",
      createdAt: 123,
      pepper: "pepper-a",
    });
    const second = await hashOtpCode({
      email: "person@example.com",
      code: "123456",
      createdAt: 123,
      pepper: "pepper-b",
    });

    expect(first).not.toBe(second);
  });

  it("rejects missing pepper in production", () => {
    expect(() => assertOtpPepper(undefined, true)).toThrow(
      "OTP_HASH_PEPPER is required in production.",
    );
  });
});
