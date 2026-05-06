import { formatInr } from "@/lib/utils";
import { AdminHeader, EmptyState, StatusPill } from "../components/AdminUi";
import type { CollectionDoc, CouponDoc, OrderDoc, ProductDoc } from "../types";
import { orderCustomerLine } from "../orders/orderDisplay";

function stockLabel(count: number) {
  if (count <= 0) {
    return { label: "Out of Stock", tone: "danger" as const };
  }

  if (count < 25) {
    return { label: "Low Stock", tone: "warning" as const };
  }

  return { label: "In Stock", tone: "success" as const };
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

export function AdminOverviewPanel({
  products,
  collections,
  orders,
  coupons,
}: {
  products: ProductDoc[];
  collections: CollectionDoc[];
  orders: OrderDoc[];
  coupons: CouponDoc[];
}) {
  const paidOrders = orders.filter((order) => order.paymentStatus === "captured");
  const revenue = paidOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const lowStock = products.filter((product) => product.inventoryCount < 25).length;
  const activeCoupons = coupons.filter((coupon) => coupon.isActive).length;

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Overview"
        description="Live store health, recent payment state, and catalog readiness."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Revenue" value={formatInr(revenue)} detail="Captured payment total" />
        <Metric label="Orders" value={`${orders.length}`} detail={`${paidOrders.length} paid orders`} />
        <Metric label="Products" value={`${products.length}`} detail={`${lowStock} need stock attention`} />
        <Metric label="Coupons" value={`${activeCoupons}`} detail={`${collections.length} collections live`} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-950">Recent orders</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {orders.slice(0, 7).map((order) => (
              <div key={order._id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_8rem_8rem] md:items-center">
                <div>
                  <p className="text-sm font-medium text-slate-950">
                    {order.items[0]?.productTitle ?? "Order"} +{Math.max(0, order.items.length - 1)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {orderCustomerLine(order)}
                  </p>
                </div>
                <StatusPill tone={order.paymentStatus === "captured" ? "success" : "warning"}>
                  {order.paymentStatus}
                </StatusPill>
                <p className="text-sm font-medium text-slate-950">
                  {formatInr(order.totalAmount)}
                </p>
              </div>
            ))}
            {orders.length === 0 ? <EmptyState label="No orders yet." /> : null}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-950">Inventory watch</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {products
              .filter((product) => product.inventoryCount < 25)
              .slice(0, 8)
              .map((product) => {
                const status = stockLabel(product.inventoryCount);
                return (
                  <div key={product._id} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div>
                      <p className="text-sm font-medium text-slate-950">{product.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{product.slug}</p>
                    </div>
                    <StatusPill tone={status.tone}>{product.inventoryCount} left</StatusPill>
                  </div>
                );
              })}
            {lowStock === 0 ? <EmptyState label="Inventory looks healthy." /> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
