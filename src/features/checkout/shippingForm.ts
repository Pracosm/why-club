export type ShippingFormState = {
  email: string;
  fullName: string;
  phoneNumber: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type ValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export const DEFAULT_SHIPPING: ShippingFormState = {
  email: "",
  fullName: "",
  phoneNumber: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
};

export function validateShippingForm(
  shipping: ShippingFormState,
): ValidationResult {
  const requiredFields: Array<[keyof ShippingFormState, string]> = [
    ["email", "email address"],
    ["fullName", "full name"],
    ["phoneNumber", "phone number"],
    ["line1", "street address"],
    ["city", "city"],
    ["state", "state"],
    ["postalCode", "PIN code"],
  ];

  for (const [field, label] of requiredFields) {
    if (shipping[field].trim().length === 0) {
      return { ok: false, message: `Add your ${label} before opening Razorpay.` };
    }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shipping.email.trim())) {
    return { ok: false, message: "Enter a valid email address." };
  }

  if (shipping.phoneNumber.replace(/\D/g, "").length < 10) {
    return { ok: false, message: "Enter a valid phone number." };
  }

  if (shipping.postalCode.replace(/\D/g, "").length < 6) {
    return { ok: false, message: "Enter a valid 6-digit PIN code." };
  }

  return { ok: true };
}

export function toShippingAddress(shipping: ShippingFormState) {
  return {
    fullName: shipping.fullName.trim(),
    phoneNumber: shipping.phoneNumber.trim(),
    line1: shipping.line1.trim(),
    line2: shipping.line2.trim() || undefined,
    city: shipping.city.trim(),
    state: shipping.state.trim(),
    postalCode: shipping.postalCode.trim(),
    country: shipping.country.trim() || "India",
  };
}
