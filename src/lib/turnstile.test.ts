import { describe, expect, it, vi } from "vitest";
import { verifyTurnstileToken } from "./turnstile";

describe("verifyTurnstileToken", () => {
  it("fails closed in production when the secret is missing", async () => {
    await expect(
      verifyTurnstileToken({
        token: "token",
        mode: "production",
      }),
    ).resolves.toEqual({
      ok: false,
      reason: "Turnstile is not configured.",
    });
  });

  it("skips verification in development when the secret is missing", async () => {
    await expect(
      verifyTurnstileToken({
        token: "",
        mode: "development",
      }),
    ).resolves.toEqual({
      ok: true,
      skipped: true,
    });
  });

  it("posts tokens to Cloudflare Siteverify", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
      }),
    );

    await expect(
      verifyTurnstileToken({
        token: "visitor-token",
        secretKey: "secret",
        remoteIp: "203.0.113.10",
        mode: "production",
        fetcher,
      }),
    ).resolves.toEqual({ ok: true });

    expect(fetcher).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
