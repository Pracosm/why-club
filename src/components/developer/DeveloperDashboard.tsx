import { useMutation, useQuery } from "convex/react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { DeveloperAccessGate } from "./DeveloperAccessGate";

type DeveloperDashboardErrorBoundaryState = {
  error: Error | null;
};

class DeveloperDashboardErrorBoundary extends Component<
  { children: ReactNode },
  DeveloperDashboardErrorBoundaryState
> {
  state: DeveloperDashboardErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Developer console failed to render", error, info.componentStack);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return <DeveloperConsoleError error={this.state.error} />;
  }
}

function DeveloperConsoleError({ error }: { error: Error }) {
  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950">
      <div className="mx-auto max-w-3xl rounded-3xl border border-rose-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-500">
          Developer console error
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          The console hit a runtime issue.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The page stayed alive so we can see the real failure instead of a
          blank screen. Refresh after the backend finishes recompiling.
        </p>
        <pre className="mt-6 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-5 text-white">
          {error.message}
        </pre>
      </div>
    </div>
  );
}

function HealthPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
        ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
      }`}
    >
      {label}: {ok ? "set" : "missing"}
    </span>
  );
}

function DeveloperDashboardSurface() {
  const settings = useQuery(api.developer.getDeveloperAuthSettings, {});
  const setEmailOtpEnabled = useMutation(api.developer.setEmailOtpEnabled);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function updateEmailOtp(enabled: boolean) {
    setIsSaving(true);
    setMessage(null);

    try {
      await setEmailOtpEnabled({ enabled });
      setMessage(enabled ? "Email OTP is now visible." : "Email OTP is hidden.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update flag.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-slate-50 text-slate-950 md:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="border-r border-slate-200 bg-white px-4 py-6">
        <div className="border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-950 text-white">
              <span className="text-xs font-black">DEV</span>
            </div>
            <div>
              <p className="text-base font-semibold">Developer Console</p>
              <p className="mt-1 text-xs text-slate-500">Super admin controls</p>
            </div>
          </div>
        </div>
        <nav className="mt-6 grid gap-1">
          <a
            href="/dev"
            className="rounded-md bg-slate-200 px-3 py-3 text-sm font-semibold text-slate-950"
          >
            Auth
          </a>
          <span className="rounded-md px-3 py-3 text-sm font-medium text-slate-400">
            Future tools
          </span>
        </nav>
        <a
          href="/admin"
          className="mt-8 inline-flex text-sm font-medium text-slate-500 transition hover:text-slate-950"
        >
          Back to admin
        </a>
      </aside>

      <main className="min-w-0 px-5 py-8 md:px-10">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Auth feature flags
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Sign-in controls
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Control which authentication options are visible across public,
            admin, and developer sign-in screens.
          </p>
        </header>

        <section className="max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          {!settings ? (
            <p className="text-sm text-slate-500">Loading developer settings...</p>
          ) : (
            <div className="space-y-8">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    Email OTP visibility
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                    {settings.emailOtpEnabled ? "Enabled" : "Disabled"}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                    When disabled, production users only see Google sign-in.
                    Email provider code remains configured in the backend.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void updateEmailOtp(!settings.emailOtpEnabled)}
                  className={`h-12 rounded-full px-6 text-sm font-semibold text-white transition disabled:opacity-50 ${
                    settings.emailOtpEnabled
                      ? "bg-slate-950 hover:bg-slate-800"
                      : "bg-sky-600 hover:bg-sky-500"
                  }`}
                >
                  {settings.emailOtpEnabled ? "Disable email OTP" : "Enable email OTP"}
                </button>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                Production default is Google-only when no Convex flag exists.
                Enable OTP only when Resend and OTP hashing configuration are ready.
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold text-slate-600">
                  Config health
                </p>
                <div className="flex flex-wrap gap-2">
                  <HealthPill
                    ok={settings.configHealth.resendApiKey}
                    label="RESEND_API_KEY"
                  />
                  <HealthPill
                    ok={settings.configHealth.resendFromEmail}
                    label="RESEND_FROM_EMAIL"
                  />
                  <HealthPill
                    ok={settings.configHealth.otpHashPepper}
                    label="OTP_HASH_PEPPER"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-700">
                  Future tools
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Add more developer-only controls here when they have real
                  backend behavior. No fake buttons, no pretend dashboards.
                </p>
              </div>

              {message ? (
                <p className="text-sm font-medium text-slate-600">{message}</p>
              ) : null}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function DeveloperDashboard() {
  return (
    <DeveloperDashboardErrorBoundary>
      <DeveloperAccessGate>
        <DeveloperDashboardSurface />
      </DeveloperAccessGate>
    </DeveloperDashboardErrorBoundary>
  );
}
