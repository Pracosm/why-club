import { AuthChoicePanel } from "@/components/auth/AuthChoicePanel";

type DeveloperAccessDeniedVariant =
  | "loading"
  | "unauthenticated"
  | "forbidden"
  | "misconfigured";

type DeveloperAccessDeniedProps = {
  variant: DeveloperAccessDeniedVariant;
  role?: string | null;
};

const copyByVariant = {
  loading: {
    eyebrow: "Developer console",
    title: "Checking access...",
    body: "Verifying your session before loading developer controls.",
  },
  unauthenticated: {
    eyebrow: "Developer console",
    title: "Sign in to continue",
    body: "This workspace controls feature flags and runtime diagnostics.",
  },
  forbidden: {
    eyebrow: "Super admin required",
    title: "This account cannot open dev tools",
    body: "Developer controls are restricted to super_admin users.",
  },
  misconfigured: {
    eyebrow: "Convex required",
    title: "Developer console needs backend config",
    body: "Set PUBLIC_CONVEX_URL and run Convex before using developer controls.",
  },
} satisfies Record<
  DeveloperAccessDeniedVariant,
  { eyebrow: string; title: string; body: string }
>;

export function DeveloperAccessDenied({
  variant,
  role,
}: DeveloperAccessDeniedProps) {
  const copy = copyByVariant[variant];
  const showAuth = variant === "unauthenticated";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_32rem),#f8fafc] px-6 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_28rem]">
        <section className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            {copy.eyebrow}
          </p>
          <h1 className="mt-5 text-5xl font-black uppercase leading-[0.9] tracking-tight text-slate-950 md:text-7xl">
            {copy.title}
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-600">
            {copy.body}
          </p>
          {variant === "forbidden" ? (
            <p className="mt-4 rounded-xl border border-rose-200 bg-white/70 px-4 py-3 text-sm text-rose-700">
              Current role: <span className="font-semibold">{role ?? "unknown"}</span>
            </p>
          ) : null}
        </section>

        {showAuth ? (
          <AuthChoicePanel
            intent="admin"
            returnTo={typeof window === "undefined" ? "/dev" : window.location.href}
          />
        ) : (
          <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-8 shadow-sm">
            <p className="text-sm font-semibold text-slate-950">
              Developer guard is active.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              The console is protected by Convex role checks and only opens for
              super admins.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
