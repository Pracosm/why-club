export function computeDiscount(
  coupon: { discountType: "percentage" | "fixed"; discountValue: number },
  subtotal: number,
) {
  if (coupon.discountType === "percentage") {
    return Math.round((subtotal * coupon.discountValue) / 100);
  }

  return Math.min(subtotal, coupon.discountValue);
}

export function computeOrderTotal(subtotal: number, discountAmount: number) {
  return Math.max(0, subtotal - discountAmount);
}
