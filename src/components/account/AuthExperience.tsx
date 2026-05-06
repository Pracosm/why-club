import { useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { AuthChoicePanel } from "@/components/auth/AuthChoicePanel";
import { ConvexClientBoundary } from "@/components/react/ConvexClientBoundary";

type AuthMode = "login" | "signup";

type AuthExperienceProps = {
  mode?: AuthMode;
};

function AuthOfflinePanel() {
  return (
    <section className="flex min-h-[80vh] items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-400">
          System status
        </p>
        <h1 className="text-5xl font-black uppercase tracking-tight text-neutral-950 md:text-7xl">
          Auth offline
        </h1>
        <p className="mx-auto max-w-sm text-sm leading-6 text-neutral-500">
          Configure `PUBLIC_CONVEX_URL` and start Convex to enable Google and email sign-in.
        </p>
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f4ee]">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border-2 border-neutral-200" />
        <div className="absolute inset-0 animate-spin rounded-full border-t-2 border-neutral-950" />
      </div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-neutral-400">
        Checking session
      </p>
    </div>
  );
}

function AuthLivePanel({ initialMode }: { initialMode: AuthMode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const [mode, setMode] = useState<AuthMode>(initialMode);

  if (isLoading) {
    return <LoadingState />;
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f4ee] px-6">
        <div className="w-full max-w-md rounded-[2rem] border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-neutral-400">
            Signed in
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
            Hello, {user.name?.split(" ")[0] ?? "member"}.
          </h1>
          <a
            href="/account"
            className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Open account
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[#f6f1e8] px-4 py-8 text-neutral-950 md:px-8 md:py-14">
      <div className="pointer-events-none fixed inset-0 opacity-[0.08] [background-image:radial-gradient(circle_at_20%_20%,#111_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_16%,rgba(223,255,63,0.42),transparent_24rem),radial-gradient(circle_at_88%_18%,rgba(255,255,255,0.9),transparent_28rem),linear-gradient(135deg,rgba(255,255,255,0.62),rgba(246,241,232,0))]" />

      <div className="relative mx-auto grid min-h-[calc(100dvh-7rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_27rem]">
        <section className="py-10 md:py-24">
          <div className="inline-flex rounded-full bg-black p-1 text-[0.62rem] font-black uppercase tracking-[0.22em] text-white">
            <span className="rounded-full bg-[#DFFF3F] px-3 py-1 text-black">Member access</span>
            <span className="px-3 py-1">Guest checkout stays open</span>
          </div>

          <h1 className="heading-condensed mt-8 max-w-4xl text-[4.6rem] font-black uppercase leading-[0.78] tracking-[-0.06em] text-black md:text-[8.5rem]">
            Get back to the drop.
          </h1>

          <p className="mt-7 max-w-xl font-editorial text-lg font-semibold leading-8 text-black/62">
            Sign in only if you want your WhÿClub account. You can still browse,
            cart, and checkout without creating one.
          </p>

          <div className="mt-10 max-w-2xl rounded-[2rem] bg-black/[0.045] p-1.5 ring-1 ring-black/[0.06]">
            <div className="grid gap-3 rounded-[calc(2rem-0.375rem)] bg-white/78 p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)] sm:grid-cols-3">
              {["Faster returns", "Drop alerts", "Receipt lookup"].map((item) => (
                <div key={item} className="rounded-[1.35rem] bg-[#f7f2ea] px-4 py-4">
                  <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-black">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="rounded-[2.35rem] bg-black/[0.055] p-1.5 ring-1 ring-black/[0.06] shadow-[0_30px_90px_-58px_rgba(0,0,0,0.8)]">
          <AuthChoicePanel mode={mode} onModeChange={setMode} />
        </div>
      </div>
    </main>
  );
}

export default function AuthExperience({ mode = "login" }: AuthExperienceProps) {
  return (
    <ConvexClientBoundary fallback={<AuthOfflinePanel />}>
      <AuthLivePanel initialMode={mode} />
    </ConvexClientBoundary>
  );
}
