export function normalizeCouponCode(value: string) {
  return value.trim().toUpperCase();
}

export function validateCouponInput(input: {
  code?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderValue: number;
  usageLimit?: number;
}) {
  if (input.code !== undefined && normalizeCouponCode(input.code).length === 0) {
    return "Coupon code is required.";
  }

  if (input.discountType === "percentage") {
    if (input.discountValue <= 0 || input.discountValue > 100) {
      return "Percentage discount must be between 1 and 100.";
    }
  } else if (input.discountValue <= 0) {
    return "Fixed discount must be greater than zero.";
  }

  if (input.minOrderValue < 0) {
    return "Minimum order value cannot be negative.";
  }

  if (input.usageLimit !== undefined && input.usageLimit <= 0) {
    return "Usage limit must be greater than zero.";
  }

  return undefined;
}

export function isCouponUsableAtCapture(coupon: {
  isActive: boolean;
  expiresAt?: number;
  usageLimit?: number;
  usedCount: number;
}, now: number) {
  if (!coupon.isActive) {
    return false;
  }

  if (coupon.expiresAt && coupon.expiresAt < now) {
    return false;
  }

  return !(coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit);
}
