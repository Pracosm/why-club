import { useEffect, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { ArrowRight, Loader2, Mail, ShieldCheck } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { publicEnv } from "@/lib/env";

type AuthIntent = "customer" | "admin";
type AuthMode = "login" | "signup";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

type AuthChoicePanelProps = {
  intent?: AuthIntent;
  mode?: AuthMode;
  returnTo?: string;
  onModeChange?: (mode: AuthMode) => void;
};

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function getReturnTo(returnTo: string | undefined) {
  if (returnTo) {
    return returnTo;
  }

  if (typeof window === "undefined") {
    return "/";
  }

  return window.location.href;
}

function getVerifyUrl(email: string, returnTo: string) {
  const url = new URL("/auth/verify", window.location.origin);
  url.searchParams.set("email", email);
  url.searchParams.set("returnTo", returnTo);
  return url.toString();
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Authentication failed. Please try again.";
}

function loadTurnstileScript() {
  const existing = document.querySelector<HTMLScriptElement>(
    'script[src="https://challenges.cloudflare.com/turnstile/v0/api.js"]',
  );

  if (window.turnstile) {
    return Promise.resolve();
  }

  if (existing) {
    return new Promise<void>((resolve) => {
      existing.addEventListener("load", () => resolve(), { once: true });
    });
  }

  return new Promise<void>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve(), { once: true });
    document.head.appendChild(script);
  });
}

async function verifyTurnstile(token: string) {
  const response = await fetch("/api/security/turnstile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });
  const result = (await response.json().catch(() => null)) as {
    ok?: boolean;
    reason?: string;
  } | null;

  if (!response.ok || result?.ok !== true) {
    throw new Error(result?.reason ?? "Security check failed.");
  }
}

export function AuthChoicePanel({
  intent = "customer",
  mode = "login",
  returnTo,
  onModeChange,
}: AuthChoicePanelProps) {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileWidgetId, setTurnstileWidgetId] = useState<string>();
  const authFlags = useQuery(api.developer.getAuthFeatureFlags, {});
  const resolvedReturnTo = getReturnTo(returnTo);
  const isAdmin = intent === "admin";
  const emailOtpEnabled = authFlags?.emailOtpEnabled === true;
  const turnstileEnabled = publicEnv.turnstileSiteKey.length > 0;

  useEffect(() => {
    if (!emailOtpEnabled || !turnstileEnabled || typeof window === "undefined") {
      return;
    }

    if (turnstileWidgetId) {
      return;
    }

    let cancelled = false;

    void loadTurnstileScript().then(() => {
      const container = document.getElementById("turnstile-email-auth");
      if (cancelled || !container || !window.turnstile) {
        return;
      }

      const widgetId = window.turnstile.render(container, {
        sitekey: publicEnv.turnstileSiteKey,
        callback: setTurnstileToken,
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () => setTurnstileToken(""),
      });
      setTurnstileWidgetId(widgetId);
    });

    return () => {
      cancelled = true;
    };
  }, [emailOtpEnabled, turnstileEnabled, turnstileWidgetId]);

  async function signInWithGoogle() {
    setError("");
    setIsGoogleLoading(true);

    try {
      await signIn("google", {
        redirectTo: resolvedReturnTo,
      });
    } catch (signInError) {
      setError(getErrorMessage(signInError));
      setIsGoogleLoading(false);
    }
  }

  async function continueWithEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError("Enter your email address.");
      return;
    }

    setError("");
    setIsEmailLoading(true);

    try {
      if (turnstileEnabled) {
        await verifyTurnstile(turnstileToken);
      }
      await signIn("email", {
        email: trimmedEmail,
        redirectTo: resolvedReturnTo,
      });
      window.location.href = getVerifyUrl(trimmedEmail, resolvedReturnTo);
    } catch (signInError) {
      setError(getErrorMessage(signInError));
      setIsEmailLoading(false);
      if (turnstileEnabled) {
        window.turnstile?.reset(turnstileWidgetId);
        setTurnstileToken("");
      }
    }
  }

  return (
    <div className="rounded-[calc(2.35rem-0.375rem)] bg-white p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.95)] md:p-8">
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-neutral-400">
            {isAdmin ? "Studio access" : "WhÿClub account"}
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-neutral-950">
            {isAdmin
              ? "Sign in to admin"
              : mode === "signup"
                ? "Create your account"
                : "Welcome back"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            {emailOtpEnabled
              ? "Continue with Google or use a one-time email code."
              : "Continue with Google for the fastest account access."}
          </p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-950 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
          <ShieldCheck className="h-5 w-5" />
        </div>
      </div>

      <button
        type="button"
        onClick={() => void signInWithGoogle()}
        disabled={isGoogleLoading || isEmailLoading}
        className="group flex h-[3.25rem] min-h-[3.25rem] w-full items-center justify-center gap-3 rounded-full bg-neutral-950 px-4 text-sm font-black uppercase tracking-[0.08em] text-white transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-neutral-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-[1px]">
          {isGoogleLoading ? <Loader2 className="h-4 w-4 animate-spin text-neutral-950" /> : <GoogleLogo />}
        </span>
        Continue with Google
      </button>

      {emailOtpEnabled ? (
        <>
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-neutral-200" />
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
              or email
            </span>
            <div className="h-px flex-1 bg-neutral-200" />
          </div>

          <form onSubmit={continueWithEmail} className="space-y-3">
            <label className="grid gap-2 text-sm font-medium text-neutral-700">
              Email address
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={isAdmin ? "admin@whyclub.in" : "you@example.com"}
                  className="h-12 w-full rounded-2xl border border-neutral-200 bg-[#fbfaf7] px-4 pr-11 text-sm text-neutral-950 outline-none transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] placeholder:text-neutral-400 focus:border-neutral-950 focus:ring-4 focus:ring-neutral-950/5"
                />
                <Mail className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              </div>
            </label>

            {turnstileEnabled ? (
              <div id="turnstile-email-auth" className="min-h-[65px]" />
            ) : null}

            <button
              type="submit"
              disabled={
                isGoogleLoading ||
                isEmailLoading ||
                (turnstileEnabled && !turnstileToken)
              }
              className="group flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#DFFF3F] px-4 text-sm font-black uppercase tracking-[0.08em] text-black transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#d4f934] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isEmailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Send email code
              {!isEmailLoading ? (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-[1px]">
                  <ArrowRight className="h-4 w-4" />
                </span>
              ) : null}
            </button>
          </form>
        </>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {!isAdmin && onModeChange ? (
        <button
          type="button"
          onClick={() => onModeChange(mode === "login" ? "signup" : "login")}
          className="mt-6 w-full text-center text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      ) : null}
    </div>
  );
}
