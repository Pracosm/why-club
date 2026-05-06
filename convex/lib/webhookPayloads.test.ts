import { describe, expect, it } from "vitest";
import {
  MAX_WEBHOOK_BODY_BYTES,
  hashPayload,
  parseJsonObject,
} from "./webhookPayloads";

describe("webhook payload helpers", () => {
  it("parses JSON objects", () => {
    expect(parseJsonObject('{"event":"payment.captured"}')).toEqual({
      ok: true,
      value: { event: "payment.captured" },
    });
  });

  it("rejects malformed JSON", () => {
    expect(parseJsonObject("{bad json")).toEqual({
      ok: false,
      reason: "Webhook payload is not valid JSON.",
    });
  });

  it("rejects non-object JSON", () => {
    expect(parseJsonObject("[]")).toEqual({
      ok: false,
      reason: "Webhook payload must be a JSON object.",
    });
  });

  it("rejects oversized payloads before parsing", () => {
    const body = `{"value":"${"x".repeat(MAX_WEBHOOK_BODY_BYTES)}"}`;

    expect(parseJsonObject(body)).toEqual({
      ok: false,
      reason: "Webhook payload is too large.",
    });
  });

  it("hashes payloads with SHA-256", async () => {
    await expect(hashPayload("webhook-body")).resolves.toBe(
      "93dbc6c5e2d42e5c47e165cbe790dcdb56f55b2e2e8a4281fa8b0247a5c3301b",
    );
  });
});
