export type PaymentTransition =
  | { action: "capture"; shouldCreateShipment: boolean }
  | { action: "fail" }
  | { action: "noop" }
  | { action: "conflict"; reason: string };

export function resolveCaptureTransition(
  order: {
    paymentStatus: string;
    razorpayPaymentId?: string;
    shiprocketShipmentId?: string;
  },
  paymentId: string,
): PaymentTransition {
  if (order.paymentStatus === "captured") {
    if (order.razorpayPaymentId && order.razorpayPaymentId !== paymentId) {
      return {
        action: "conflict",
        reason: "Order is already captured with a different payment.",
      };
    }

    return { action: "noop" };
  }

  return {
    action: "capture",
    shouldCreateShipment: !order.shiprocketShipmentId,
  };
}

export function resolveFailureTransition(order: {
  paymentStatus: string;
}): PaymentTransition {
  if (order.paymentStatus === "captured") {
    return { action: "noop" };
  }

  return { action: "fail" };
}
