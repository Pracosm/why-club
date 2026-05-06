import { describe, expect, it } from "vitest";
import { assertValidEmail, normalizeEmail } from "./emailValidation";

describe("email validation helpers", () => {
  it("trims and lowercases email input", () => {
    expect(normalizeEmail("  PERSON@Example.COM  ")).toBe("person@example.com");
  });

  it("accepts a normal email", () => {
    expect(assertValidEmail("person@example.com")).toBe("person@example.com");
  });

  it("rejects missing @", () => {
    expect(() => assertValidEmail("person.example.com")).toThrow(
      "Enter a valid email address.",
    );
  });

  it("rejects missing domain", () => {
    expect(() => assertValidEmail("person@")).toThrow(
      "Enter a valid email address.",
    );
  });

  it("rejects whitespace-only input", () => {
    expect(() => assertValidEmail("   ")).toThrow(
      "Enter a valid email address.",
    );
  });
});
