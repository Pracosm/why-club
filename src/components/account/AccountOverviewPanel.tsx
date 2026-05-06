import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ConvexClientBoundary } from "@/components/react/ConvexClientBoundary";
import { formatInr } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";
import { gsap } from "gsap";
import { ArrowRight, ChevronRight, LogOut, Package, Settings, User } from "lucide-react";

const activeOrderStatuses = new Set([
  "pending",
  "confirmed",
  "processing",
  "shipped",
]);

function formatDate(value: number | undefined) {
  if (!value) return "---";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function normalizeStatus(value: string | undefined) {
  return value ? value.replaceAll("_", " ") : "pending";
}

function isActiveOrder(order: { status: string; paymentStatus: string }) {
  if (order.paymentStatus === "failed" || order.paymentStatus === "refunded") {
    return false;
  }
  return activeOrderStatuses.has(order.status);
}

function AccountOfflinePanel() {
  return (
    <section className="flex min-h-[80vh] items-center justify-center px-6">
      <div className="w-full max-w-2xl text-center">
        <p className="text-[0.62rem] font-black uppercase tracking-[0.4em] text-black/30">
          System Status
        </p>
        <h1 className="heading-condensed mt-6 text-6xl font-black uppercase leading-none tracking-tight text-black md:text-8xl">
          Offline.
        </h1>
        <p className="mx-auto mt-8 max-w-sm font-editorial text-sm leading-relaxed text-black/50">
          Configure PUBLIC_CONVEX_URL and start the backend to access your orders and profile.
        </p>
        <a
          href="/login"
          className="mt-12 inline-flex h-14 items-center justify-center rounded-full bg-black px-10 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-white transition hover:scale-[1.02] active:scale-[0.98]"
        >
          Return to login
        </a>
      </div>
    </section>
  );
}

function StatusPill({ label, status }: { label: string; status: string }) {
  const isNeutral = status === "pending" || status === "processing";
  const isGood = status === "shipped" || status === "delivered" || status === "captured";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.55rem] font-black uppercase tracking-widest ${
      isGood
        ? "bg-emerald-50 text-emerald-600"
        : isNeutral
          ? "bg-black/5 text-black/50"
          : "bg-black text-white"
    }`}>
      <span className={`h-1 w-1 rounded-full ${isGood ? "bg-emerald-500" : isNeutral ? "bg-black/20" : "bg-white"}`} />
      {label}
    </span>
  );
}

function OrderManifestRow({ order }: { order: any }) {
  const leadItem = order.items[0];
  const paidLabel = order.paymentStatus === "captured" ? "PAID" : normalizeStatus(order.paymentStatus).toUpperCase();

  return (
    <div className="group relative border-b border-black/5 py-8 transition-colors hover:bg-black/[0.01]">
      <div className="grid gap-6 md:grid-cols-[1fr_auto_auto_auto] md:items-center md:gap-12">
        <div>
          <p className="text-[0.6rem] font-black uppercase tracking-widest text-black/25">
            {order.razorpayOrderId ?? order._id.slice(0, 8)}
          </p>
          <h3 className="mt-2 text-xl font-black tracking-tight text-black md:text-2xl">
            {leadItem?.productTitle ?? "WhÿClub Order"}
          </h3>
          <div className="mt-3 flex flex-wrap gap-3">
            <StatusPill label={normalizeStatus(order.status)} status={order.status} />
            <StatusPill label={paidLabel} status={order.paymentStatus} />
          </div>
        </div>

        <div className="grid gap-1">
          <p className="text-[0.55rem] font-black uppercase tracking-widest text-black/25">Date</p>
          <p className="text-xs font-bold text-black/60">{formatDate(order.createdAt)}</p>
        </div>

        <div className="grid gap-1">
          <p className="text-[0.55rem] font-black uppercase tracking-widest text-black/25">Amount</p>
          <p className="text-sm font-black text-black">{formatInr(order.totalAmount)}</p>
        </div>

        <div className="flex justify-end">
          <button className="flex h-10 w-10 items-center justify-center rounded-full border border-black/5 bg-white text-black/20 shadow-sm transition group-hover:border-black/20 group-hover:text-black">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileCard({ user }: { user: any }) {
  const updateProfile = useMutation(api.users.updateProfile);
  const [name, setName] = useState(user.name ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage("");
    try {
      await updateProfile({ name });
      setMessage("Profile synced.");
    } catch (err) {
      setMessage("Sync failed.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="sticky top-24 space-y-8">
      <div className="overflow-hidden rounded-[2.5rem] bg-black p-1 text-white">
        <div className="relative rounded-[calc(2.5rem-0.25rem)] bg-[#0A0A0A] p-8">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-[#DFFF3F]/10 blur-3xl" />

          <p className="text-[0.6rem] font-black uppercase tracking-[0.4em] text-white/30">Member Identity</p>
          <h2 className="mt-8 heading-condensed text-5xl font-black uppercase leading-none tracking-tight">
            {user.name?.split(" ")[0] ?? "Member"}
          </h2>
          <p className="mt-3 truncate text-xs font-bold text-white/40">{user.email}</p>

          <div className="mt-12 space-y-6">
            <form onSubmit={handleSave} className="space-y-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Member Name"
                className="h-12 w-full rounded-xl bg-white/5 px-4 text-sm font-bold outline-none transition focus:bg-white/10 focus:ring-2 focus:ring-[#DFFF3F]/20"
              />
              <button
                disabled={isSaving}
                className="flex h-12 w-full items-center justify-between rounded-full bg-[#DFFF3F] px-6 text-[0.65rem] font-black uppercase tracking-widest text-black transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {isSaving ? "Syncing..." : "Update Profile"}
                <ArrowRight className="h-4 w-4" />
              </button>
              {message && <p className="text-center text-[0.6rem] font-black uppercase tracking-widest text-[#DFFF3F]">{message}</p>}
            </form>
          </div>
        </div>
      </div>

      <div className="rounded-[2.5rem] border border-black/5 bg-[#F9F7F2] p-8">
        <p className="text-[0.6rem] font-black uppercase tracking-[0.4em] text-black/30">Account Tools</p>
        <div className="mt-6 grid gap-2">
          {[
            { label: "Drop Preferences", icon: Package },
            { label: "Security Settings", icon: Settings },
            { label: "Support Access", icon: User },
          ].map((tool) => (
            <button key={tool.label} className="flex h-12 items-center gap-4 rounded-2xl px-4 text-[0.65rem] font-bold uppercase tracking-widest text-black/60 transition hover:bg-black/5 hover:text-black">
              <tool.icon className="h-4 w-4" />
              {tool.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AccountLivePanel() {
  const { signOut } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const orders = useQuery(api.orders.listMine, isAuthenticated ? {} : "skip");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const ctx = gsap.context(() => {
        gsap.from(".animate-reveal", {
          y: 40,
          opacity: 0,
          duration: 1.2,
          stagger: 0.1,
          ease: "power4.out"
        });
      }, containerRef);
      return () => ctx.revert();
    }
  }, [isLoading, isAuthenticated, user]);

  const stats = useMemo(() => {
    const sorted = [...(orders ?? [])].sort((a, b) => b.createdAt - a.createdAt);
    const active = sorted.filter(isActiveOrder);
    const past = sorted.filter(o => !isActiveOrder(o));
    const totalSpent = sorted
      .filter(o => o.paymentStatus === "captured")
      .reduce((acc, o) => acc + o.totalAmount, 0);

    return { active, past, totalSpent };
  }, [orders]);

  if (isLoading) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="h-2 w-48 overflow-hidden rounded-full bg-black/5">
        <div className="h-full w-1/3 animate-[loading_1.5s_infinite_ease-in-out] rounded-full bg-black" />
      </div>
      <p className="text-[0.6rem] font-black uppercase tracking-[0.4em] text-black/20 text-center">Syncing Session</p>
    </div>
  );

  if (!isAuthenticated) return (
    <section className="flex min-h-[85vh] items-center justify-center px-6">
      <div className="w-full max-w-4xl text-center">
        <p className="text-[0.62rem] font-black uppercase tracking-[0.4em] text-black/30">Vault Access</p>
        <h1 className="heading-condensed mt-8 text-[5rem] font-black uppercase leading-[0.8] tracking-tight text-black md:text-[9rem]">
          Your Closet <br /> is Locked.
        </h1>
        <p className="mx-auto mt-12 max-w-sm font-editorial text-lg font-semibold leading-relaxed text-black/60">
          Sign in to view your orders, track shipments, and manage your WhÿClub membership.
        </p>
        <div className="mt-16">
          <AuthActionButton className="h-16 rounded-full bg-black px-12 text-[0.7rem] font-black uppercase tracking-[0.25em] text-white transition hover:scale-[1.05] active:scale-[0.95]" />
        </div>
      </div>
    </section>
  );

  if (!user || !orders) return null;

  return (
    <main ref={containerRef} className="min-h-screen bg-[#FDFBF7] px-6 py-12 md:px-12 md:py-24">
      <div className="mx-auto max-w-7xl">
        <header className="animate-reveal flex flex-col gap-12 md:flex-row md:items-end md:justify-between">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-[#DFFF3F]" />
              <p className="text-[0.65rem] font-black uppercase tracking-[0.4em] text-black/40">WhÿClub Identity</p>
            </div>
            <h1 className="heading-condensed text-[5.5rem] font-black uppercase leading-[0.75] tracking-tight text-black md:text-[10rem]">
              Hello, <br /> {user.name?.split(" ")[0] ?? "Member"}.
            </h1>
          </div>

          <button
            onClick={() => void signOut().then(() => window.location.href = "/")}
            className="group flex h-14 items-center gap-4 rounded-full border border-black/5 bg-white px-8 text-[0.65rem] font-black uppercase tracking-widest text-black shadow-sm transition hover:bg-black hover:text-white"
          >
            Sign Out
            <LogOut className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </header>

        <div className="animate-reveal mt-20 grid grid-cols-1 gap-12 lg:grid-cols-[1fr_24rem]">
          <div className="space-y-24">
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-8 border-y border-black/5 py-10">
              {[
                { label: "Active Drops", value: stats.active.length },
                { label: "Past Grails", value: stats.past.length },
                { label: "Contribution", value: formatInr(stats.totalSpent) },
              ].map((stat) => (
                <div key={stat.label} className="space-y-2">
                  <p className="text-[0.55rem] font-black uppercase tracking-widest text-black/30">{stat.label}</p>
                  <p className="text-2xl font-black text-black md:text-4xl tracking-tighter">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Orders Section */}
            <div className="space-y-12">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-[0.4em] text-black">Movement</h2>
                <span className="text-[0.65rem] font-bold text-black/40">{stats.active.length} ACTIVE</span>
              </div>

              <div className="grid gap-0">
                {stats.active.length > 0 ? (
                  stats.active.map(order => <OrderManifestRow key={order._id} order={order} />)
                ) : (
                  <p className="py-12 font-editorial text-sm font-medium italic text-black/40">No active movements at this time.</p>
                )}
              </div>
            </div>

            <div className="space-y-12">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-[0.4em] text-black">Archive</h2>
                <span className="text-[0.65rem] font-bold text-black/40">{stats.past.length} PAST</span>
              </div>

              <div className="grid gap-0 opacity-60 transition-opacity hover:opacity-100">
                {stats.past.length > 0 ? (
                  stats.past.map(order => <OrderManifestRow key={order._id} order={order} />)
                ) : (
                  <p className="py-12 font-editorial text-sm font-medium italic text-black/40">Your archive is currently empty.</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="animate-reveal">
            <ProfileCard user={user} />
          </div>
        </div>
      </div>
    </main>
  );
}

import { AuthActionButton } from "@/components/react/StorefrontClient";

export default function AccountOverviewPanel() {
  return (
    <ConvexClientBoundary fallback={<AccountOfflinePanel />}>
      <AccountLivePanel />
    </ConvexClientBoundary>
  );
}
