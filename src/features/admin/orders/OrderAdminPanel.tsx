import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { formatInr } from "@/lib/utils";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { AdminHeader, Detail, EmptyState, Field, Select, StatusPill } from "../components/AdminUi";
import type { OrderDoc } from "../types";
import {
  detailFallback,
  formatAddress,
  formatDate,
  orderCityLine,
  orderCustomerLine,
  orderFulfillmentReadiness,
  orderStatuses,
} from "./orderDisplay";

export function OrderAdminPanel({ orders }: { orders: OrderDoc[] }) {
  const syncRazorpayOrder = useAction(api.orders.syncRazorpayOrder);
  const dispatchOrder = useAction(api.shipping.dispatchOrder);
  const syncTracking = useAction(api.shipping.syncTracking);
  const updateStatus = useMutation(api.orders.updateStatus);
  const sortedOrders = [...orders].sort((a, b) => b.createdAt - a.createdAt);
  const [selectedId, setSelectedId] = useState<Id<"orders"> | null>(sortedOrders[0]?._id ?? null);
  const selected = sortedOrders.find((order) => order._id === selectedId) ?? sortedOrders[0] ?? null;
  const [message, setMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const shippingUpdates = useQuery(
    api.shipping.listForOrder,
    selected ? { orderId: selected._id } : "skip",
  );
  const latestTracking = shippingUpdates
    ? [...shippingUpdates].sort((a, b) => b.trackedAt - a.trackedAt)[0]
    : null;
  const readiness = selected ? orderFulfillmentReadiness(selected) : null;

  async function setOrderStatus(order: OrderDoc, status: (typeof orderStatuses)[number]) {
    try {
      await updateStatus({ orderId: order._id, status });
      setMessage("Order status updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update order.");
    }
  }

  async function runProviderAction(action: "razorpay" | "dispatch" | "tracking") {
    if (!selected) {
      return;
    }

    setIsSyncing(true);
    setMessage(null);

    try {
      if (action === "razorpay") {
        const result = await syncRazorpayOrder({ orderId: selected._id });
        setMessage(result.message);
      }

      if (action === "dispatch") {
        const result = await dispatchOrder({ orderId: selected._id });
        setMessage(
          result.skipped
            ? (result.reason ?? "Shiprocket shipment was skipped.")
            : "Shiprocket shipment created.",
        );
      }

      if (action === "tracking") {
        const result = await syncTracking({ orderId: selected._id });
        setMessage(result.reason ?? "Shiprocket tracking synced.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Provider sync failed.");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Orders"
        description="Monitor paid orders, payment state, shipping address, and fulfilment progress."
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_30rem]">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[1fr_7rem_7rem_7rem] gap-4 border-b border-slate-100 px-5 py-3 text-xs font-medium text-slate-500">
            <span>Order</span>
            <span>Status</span>
            <span>Payment</span>
            <span>Total</span>
          </div>
          <div className="divide-y divide-slate-100">
            {sortedOrders.map((order) => (
              <button
                type="button"
                key={order._id}
                onClick={() => setSelectedId(order._id)}
                className={`grid w-full grid-cols-[1fr_7rem_7rem_7rem] gap-4 px-5 py-4 text-left hover:bg-slate-50 ${
                  selected?._id === order._id ? "bg-slate-50" : ""
                }`}
              >
                <span>
                  <span className="block text-sm font-medium text-slate-950">
                    {order.items[0]?.productTitle ?? "Order"}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {orderCustomerLine(order)}
                  </span>
                  <span className="mt-1 block font-mono text-[11px] text-slate-400">
                    {order.razorpayOrderId ?? order._id}
                  </span>
                </span>
                <span className="self-center text-sm text-slate-600">{order.status}</span>
                <span className="self-center text-sm text-slate-600">{order.paymentStatus}</span>
                <span className="self-center text-sm font-medium text-slate-950">{formatInr(order.totalAmount)}</span>
              </button>
            ))}
            {sortedOrders.length === 0 ? <EmptyState label="No orders yet." /> : null}
          </div>
        </section>

        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          {selected ? (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-medium text-slate-500">Selected order</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">
                  {selected.items[0]?.productTitle ?? selected._id}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{formatDate(selected.createdAt)}</p>
              </div>
              {readiness ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-950">Fulfilment readiness</p>
                    <StatusPill tone={readiness.tone}>{readiness.label}</StatusPill>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-600">{readiness.detail}</p>
                </div>
              ) : null}
              <div className="grid gap-3">
                <Detail label="Convex order ID" value={selected._id} />
                <Detail label="Razorpay order ID" value={detailFallback(selected.razorpayOrderId, "Not attached yet")} />
                <Detail label="Razorpay payment ID" value={detailFallback(selected.razorpayPaymentId, "Not captured yet")} />
                <Detail label="Checkout mode" value={selected.checkoutMode ?? (selected.userId ? "signed_in" : "guest_magic")} />
                <Detail label="Customer" value={selected.shippingAddress?.fullName ?? selected.customerName ?? "Guest customer"} />
                <Detail label="Email" value={detailFallback(selected.customerEmail, "Awaiting email from Razorpay")} />
                <Detail label="Phone" value={selected.shippingAddress?.phoneNumber ?? selected.customerPhone ?? "Awaiting phone"} />
                <Detail label="Shipping city" value={orderCityLine(selected)} />
                <Detail label="Shipping address" value={formatAddress(selected)} />
                <Detail label="Shiprocket order ID" value={detailFallback(selected.shiprocketOrderId, "Shipment not created")} />
                <Detail label="Shiprocket shipment ID" value={detailFallback(selected.shiprocketShipmentId, "Shipment not created")} />
                <Detail label="Latest tracking" value={latestTracking ? `${latestTracking.trackingStatus}${latestTracking.location ? ` · ${latestTracking.location}` : ""}` : "No tracking update yet"} />
                <Detail label="Payment" value={`${selected.paymentStatus} · ${formatInr(selected.totalAmount)} ${selected.currency}`} />
                <Detail label="Discount" value={selected.discountAmount > 0 ? `${formatInr(selected.discountAmount)} via ${selected.couponCode ?? "coupon"}` : "No discount"} />
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={() => void runProviderAction("razorpay")}
                  className="h-10 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Sync Razorpay
                </button>
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={() => void runProviderAction("dispatch")}
                  className="h-10 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Create Shipment
                </button>
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={() => void runProviderAction("tracking")}
                  className="h-10 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Sync Tracking
                </button>
              </div>
              <Field label="Fulfilment status">
                <Select value={selected.status} onChange={(event) => void setOrderStatus(selected, event.target.value as (typeof orderStatuses)[number])}>
                  {orderStatuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </Select>
              </Field>
              <div>
                <h3 className="text-sm font-semibold text-slate-950">Items</h3>
                <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {selected.items.map((item) => (
                    <div key={`${item.productId}-${item.size ?? "default"}`} className="px-3 py-3 text-sm">
                      <div className="font-medium text-slate-950">{item.productTitle}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Qty {item.quantity} · {item.size ?? "Default"} · {formatInr(item.lineTotal)}
                      </div>
                      <div className="mt-1 font-mono text-[11px] text-slate-400">
                        {item.productSlug} · {item.productId}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {message ? <p className="text-sm text-slate-500">{message}</p> : null}
            </div>
          ) : (
            <EmptyState label="Select an order." />
          )}
        </aside>
      </div>
    </div>
  );
}
