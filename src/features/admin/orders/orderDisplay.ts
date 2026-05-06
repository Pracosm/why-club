import type { OrderDoc } from "../types";

export const orderStatuses = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export function formatDate(value: number | undefined) {
  if (!value) {
    return "No expiry";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function orderCustomerLine(order: OrderDoc) {
  const address = order.shippingAddress;
  if (address) {
    return `${address.fullName} · ${address.city}`;
  }

  return order.customerEmail ?? order.customerPhone ?? "Awaiting Razorpay address";
}

export function orderCityLine(order: OrderDoc) {
  const address = order.shippingAddress;
  return address ? `${address.city}, ${address.state}` : "Awaiting address";
}

export function orderFulfillmentReadiness(order: OrderDoc) {
  if (order.paymentStatus !== "captured") {
    return {
      label: "Awaiting payment capture",
      tone: "warning" as const,
      detail: "Do not fulfil this order until Razorpay confirms payment.",
    };
  }

  if (!order.shippingAddress) {
    return {
      label: "Awaiting Razorpay address",
      tone: "warning" as const,
      detail: "This order has no shipping address yet. Re-check Razorpay or the customer before dispatch.",
    };
  }

  if (order.shiprocketShipmentId || order.shiprocketOrderId) {
    return {
      label: "Shipment created",
      tone: "success" as const,
      detail: "Shiprocket details are attached to this order.",
    };
  }

  return {
    label: "Ready to ship",
    tone: "success" as const,
    detail: "Payment and shipping address are present.",
  };
}

export function formatAddress(order: OrderDoc) {
  const address = order.shippingAddress;
  if (!address) {
    return "Razorpay has not returned a shipping address yet.";
  }

  return [
    address.fullName,
    address.phoneNumber,
    address.line1,
    address.line2,
    `${address.city}, ${address.state} ${address.postalCode}`,
    address.country,
  ]
    .filter(Boolean)
    .join("\n");
}

export function detailFallback(value: string | undefined, fallback: string) {
  return value && value.trim().length > 0 ? value : fallback;
}
