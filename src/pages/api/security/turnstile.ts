import type { APIRoute } from "astro";
import { publicEnv } from "@/lib/env";
import { verifyTurnstileToken } from "@/lib/turnstile";

type CloudflareLocals = {
  runtime?: {
    env?: Record<string, string | undefined>;
  };
};

function getRuntimeSecret(locals: App.Locals) {
  const cloudflareEnv = (locals as CloudflareLocals).runtime?.env;
  return cloudflareEnv?.TURNSTILE_SECRET_KEY ?? import.meta.env.TURNSTILE_SECRET_KEY;
}

function getClientIp(request: Request) {
  return (
    request.headers.get("CF-Connecting-IP") ??
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim()
  );
}

export const POST: APIRoute = async ({ request, locals }) => {
  const body = (await request.json().catch(() => null)) as {
    token?: unknown;
  } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  const result = await verifyTurnstileToken({
    token,
    secretKey: getRuntimeSecret(locals),
    remoteIp: getClientIp(request),
    mode: publicEnv.runtimeMode,
  });

  return Response.json(result, {
    status: result.ok ? 200 : 403,
  });
};
