import { describe, expect, it } from "vitest";
import {
  DEFAULT_SHIPPING,
  type ShippingFormState,
  validateShippingForm,
} from "./shippingForm";

const validShipping: ShippingFormState = {
  ...DEFAULT_SHIPPING,
  email: "aisha@example.com",
  fullName: "Aisha Khan",
  phoneNumber: "+91 98765 43210",
  line1: "221 Bandra Road",
  city: "Mumbai",
  state: "Maharashtra",
  postalCode: "400050",
};

describe("validateShippingForm", () => {
  it("returns a specific message when email is missing", () => {
    expect(validateShippingForm({ ...validShipping, email: "" })).toEqual({
      ok: false,
      message: "Add your email address before opening Razorpay.",
    });
  });

  it("returns a specific message when email is invalid", () => {
    expect(validateShippingForm({ ...validShipping, email: "aisha" })).toEqual({
      ok: false,
      message: "Enter a valid email address.",
    });
  });

  it("fails when phone number has fewer than 10 digits", () => {
    expect(validateShippingForm({ ...validShipping, phoneNumber: "12345" })).toEqual({
      ok: false,
      message: "Enter a valid phone number.",
    });
  });

  it("fails when postal code has fewer than 6 digits", () => {
    expect(validateShippingForm({ ...validShipping, postalCode: "40005" })).toEqual({
      ok: false,
      message: "Enter a valid 6-digit PIN code.",
    });
  });

  it("returns success for a valid form", () => {
    expect(validateShippingForm(validShipping)).toEqual({ ok: true });
  });
});
