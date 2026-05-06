type TurnstileSiteverifyResponse = {
  success: boolean;
  "error-codes"?: string[];
};

type VerifyTurnstileArgs = {
  token: string;
  secretKey?: string;
  remoteIp?: string;
  mode: "development" | "production";
  fetcher?: typeof fetch;
};

export type TurnstileVerificationResult =
  | { ok: true; skipped?: true }
  | { ok: false; reason: string };

export async function verifyTurnstileToken({
  token,
  secretKey,
  remoteIp,
  mode,
  fetcher = fetch,
}: VerifyTurnstileArgs): Promise<TurnstileVerificationResult> {
  if (!secretKey) {
    return mode === "production"
      ? { ok: false, reason: "Turnstile is not configured." }
      : { ok: true, skipped: true };
  }

  if (!token.trim()) {
    return { ok: false, reason: "Complete the security check." };
  }

  const body = new URLSearchParams({
    secret: secretKey,
    response: token,
  });

  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  const response = await fetcher(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body,
    },
  );

  if (!response.ok) {
    return { ok: false, reason: "Security check failed." };
  }

  const result = (await response.json()) as TurnstileSiteverifyResponse;
  return result.success
    ? { ok: true }
    : { ok: false, reason: "Security check failed." };
}
