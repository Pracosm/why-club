import { AuthChoicePanel } from "@/components/auth/AuthChoicePanel";

type AdminAccessDeniedVariant =
  | "loading"
  | "unauthenticated"
  | "forbidden"
  | "misconfigured";

type AdminAccessDeniedProps = {
  variant: AdminAccessDeniedVariant;
  role?: string | null;
};

const copyByVariant = {
  loading: {
    eyebrow: "Admin access",
    title: "Checking admin session...",
    body: "Verifying your account before loading products, orders, coupons, and fulfillment tools.",
  },
  unauthenticated: {
    eyebrow: "Studio access",
    title: "Sign in to manage WhyClub",
    body: "Use Google or email code. Convex will only open the admin workspace if this account has an admin role.",
  },
  forbidden: {
    eyebrow: "Permission denied",
    title: "This account is not an admin",
    body: "The sign-in worked, but this user does not have the super_admin or admin role in Convex.",
  },
  misconfigured: {
    eyebrow: "Convex required",
    title: "Live admin needs backend config",
    body: "Set PUBLIC_CONVEX_URL, run Convex, and configure Google OAuth before opening admin.",
  },
} satisfies Record<AdminAccessDeniedVariant, { eyebrow: string; title: string; body: string }>;

export function AdminAccessDenied({ variant, role }: AdminAccessDeniedProps) {
  const copy = copyByVariant[variant];
  const showAuth = variant === "unauthenticated";
  const isForbidden = variant === "forbidden";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e7e1d7,transparent_32rem),#f7f4ee] px-6 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_28rem]">
        <section className="max-w-2xl">
          <p className={`text-xs font-semibold uppercase tracking-[0.3em] ${
            isForbidden ? "text-rose-600" : "text-neutral-500"
          }`}>
            {copy.eyebrow}
          </p>
          <h1 className="mt-5 text-5xl font-black uppercase leading-[0.9] tracking-tight text-neutral-950 md:text-7xl">
            {copy.title}
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-neutral-600">
            {copy.body}
          </p>
          {isForbidden ? (
            <p className="mt-4 rounded-xl border border-rose-200 bg-white/70 px-4 py-3 text-sm text-rose-700">
              Current role: <span className="font-semibold">{role ?? "unknown"}</span>
            </p>
          ) : null}
          {variant === "loading" ? (
            <div className="mt-8 h-2 w-52 overflow-hidden rounded-full bg-neutral-200">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-neutral-950" />
            </div>
          ) : null}
        </section>

        {showAuth ? (
          <AuthChoicePanel intent="admin" returnTo={typeof window === "undefined" ? "/admin" : window.location.href} />
        ) : (
          <div className="rounded-[2rem] border border-neutral-200 bg-white/80 p-8 shadow-sm">
            <p className="text-sm font-semibold text-neutral-950">Admin guard is active.</p>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Access is enforced by Convex role checks on every admin query, mutation, and provider sync action.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
