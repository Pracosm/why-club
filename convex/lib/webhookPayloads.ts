export type JsonObject = Record<string, unknown>;
export const MAX_WEBHOOK_BODY_BYTES = 256 * 1024;

export type ParseJsonObjectResult =
  | { ok: true; value: JsonObject }
  | { ok: false; reason: string };

export function parseJsonObject(rawBody: string): ParseJsonObjectResult {
  if (new TextEncoder().encode(rawBody).byteLength > MAX_WEBHOOK_BODY_BYTES) {
    return {
      ok: false,
      reason: "Webhook payload is too large.",
    };
  }

  try {
    const value: unknown = JSON.parse(rawBody);

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {
        ok: false,
        reason: "Webhook payload must be a JSON object.",
      };
    }

    return {
      ok: true,
      value: value as JsonObject,
    };
  } catch {
    return {
      ok: false,
      reason: "Webhook payload is not valid JSON.",
    };
  }
}

export async function hashPayload(rawBody: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(rawBody),
  );

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
