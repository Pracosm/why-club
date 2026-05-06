import { useConvexAuth, useQuery } from "convex/react";
import type { ReactNode } from "react";
import { ConvexClientBoundary } from "@/components/react/ConvexClientBoundary";
import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { api } from "../../../convex/_generated/api";

type AdminAccessGateProps = {
  children: ReactNode;
};

const adminSections = [
  { href: "/admin", label: "Overview", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/admin/orders", label: "Orders", icon: "M6 7h12v12H6zM8 4h8v3H8z" },
  { href: "/admin/products", label: "Products", icon: "M7 4h10l3 5-2.5 1.5L16 8v12H8V8l-1.5 2.5L4 9z" },
  { href: "/admin/collections", label: "Collections", icon: "M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z" },
  { href: "/admin/coupons", label: "Discounts", icon: "M4 12l8-8h7v7l-8 8zM15 7h.01" },
] as const;

function isAdminRole(role: string | undefined) {
  return role === "super_admin" || role === "admin";
}

function AdminShell({ children }: AdminAccessGateProps) {
  const pathname = typeof window === "undefined" ? "/admin" : window.location.pathname;

  return (
    <div className="grid min-h-screen md:grid-cols-[16rem_minmax(0,1fr)]">
      <header className="border-b border-slate-200 bg-slate-50 px-4 py-4 md:hidden">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-950 text-white">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path d="M7 4h10l3 5-2.5 1.5L16 8v12H8V8l-1.5 2.5L4 9z" />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold">WhyClub Studio</p>
              <p className="text-xs text-slate-500">Live admin</p>
            </div>
          </div>
        </div>
        <nav className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Admin sections">
          {adminSections.map((section) => {
            const active = pathname === section.href;

            return (
              <a
                key={section.href}
                href={section.href}
                className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-slate-950 text-white" : "bg-white text-slate-600 hover:text-slate-950"
                }`}
              >
                {section.label}
              </a>
            );
          })}
        </nav>
      </header>

      <aside className="sticky top-0 hidden h-screen border-r border-slate-200 bg-slate-50 px-4 py-6 text-slate-900 md:flex md:flex-col">
        <div className="flex items-center gap-3 border-b border-slate-200 px-2 pb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-950 text-white">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              <path d="M7 4h10l3 5-2.5 1.5L16 8v12H8V8l-1.5 2.5L4 9z" />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold">WhyClub Studio</p>
            <p className="text-xs text-slate-500">Live admin</p>
          </div>
        </div>

        <nav className="mt-6 flex flex-col gap-1" aria-label="Admin sections">
          {adminSections.map((section) => {
            const active = pathname === section.href;

            return (
              <a
                key={section.href}
                href={section.href}
                className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-slate-200 text-slate-950"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path d={section.icon} />
                </svg>
                {section.label}
              </a>
            );
          })}
        </nav>

        <div className="mt-auto rounded-md border border-slate-200 bg-white p-3 text-sm shadow-sm">
          <p className="font-medium text-slate-950">Admin</p>
          <p className="mt-1 text-xs text-slate-500">Convex protected</p>
        </div>
      </aside>

      <main className="min-w-0 px-4 py-6 md:px-8 md:py-10">{children}</main>
    </div>
  );
}

function AdminAccessGateSurface({ children }: AdminAccessGateProps) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.me, isAuthenticated ? {} : "skip");

  if (isLoading || (isAuthenticated && user === undefined)) {
    return <AdminAccessDenied variant="loading" />;
  }

  if (!isAuthenticated) {
    return <AdminAccessDenied variant="unauthenticated" />;
  }

  if (!isAdminRole(user?.role)) {
    return <AdminAccessDenied variant="forbidden" role={user?.role} />;
  }

  return <AdminShell>{children}</AdminShell>;
}

export function AdminAccessGate({ children }: AdminAccessGateProps) {
  return (
    <ConvexClientBoundary fallback={<AdminAccessDenied variant="misconfigured" />}>
      <AdminAccessGateSurface>{children}</AdminAccessGateSurface>
    </ConvexClientBoundary>
  );
}
