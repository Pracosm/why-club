import { useQuery } from "convex/react";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { CollectionAdminPanel } from "@/features/admin/collections/CollectionAdminPanel";
import { CouponAdminPanel } from "@/features/admin/coupons/CouponAdminPanel";
import { OrderAdminPanel } from "@/features/admin/orders/OrderAdminPanel";
import { AdminOverviewPanel } from "@/features/admin/overview/AdminOverviewPanel";
import { ProductAdminPanel } from "@/features/admin/products/ProductAdminPanel";
import type { AdminSection } from "@/features/admin/types";
import { api } from "../../../convex/_generated/api";

function AdminLiveSurface({ section }: { section: AdminSection }) {
  const products = useQuery(api.products.listAll, {});
  const collections = useQuery(api.collections.listAll, {});
  const orders = useQuery(api.orders.listAll, {});
  const coupons = useQuery(api.coupons.listAll, {});

  if (!products || !collections || !orders || !coupons) {
    return <div className="p-8 text-sm text-slate-500">Loading live admin data...</div>;
  }

  if (section === "products") {
    return <ProductAdminPanel products={products} collections={collections} />;
  }

  if (section === "collections") {
    return <CollectionAdminPanel collections={collections} />;
  }

  if (section === "orders") {
    return <OrderAdminPanel orders={orders} />;
  }

  if (section === "coupons") {
    return <CouponAdminPanel coupons={coupons} />;
  }

  return (
    <AdminOverviewPanel
      products={products}
      collections={collections}
      orders={orders}
      coupons={coupons}
    />
  );
}

export default function AdminLiveApp({ section }: { section: AdminSection }) {
  return (
    <AdminAccessGate>
      <AdminLiveSurface section={section} />
    </AdminAccessGate>
  );
}
