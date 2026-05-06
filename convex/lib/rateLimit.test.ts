import { describe, expect, it } from "vitest";
import { resolveRateLimit } from "./rateLimit";

describe("resolveRateLimit", () => {
  it("starts a new window when no state exists", () => {
    expect(
      resolveRateLimit(null, {
        limit: 3,
        windowMs: 60_000,
        now: 1_000,
      }),
    ).toEqual({
      allowed: true,
      count: 1,
      resetAt: 61_000,
      retryAfterMs: 0,
    });
  });

  it("increments inside the active window", () => {
    expect(
      resolveRateLimit(
        { count: 2, resetAt: 61_000 },
        {
          limit: 3,
          windowMs: 60_000,
          now: 2_000,
        },
      ),
    ).toMatchObject({
      allowed: true,
      count: 3,
      resetAt: 61_000,
    });
  });

  it("blocks when the active window is exhausted", () => {
    expect(
      resolveRateLimit(
        { count: 3, resetAt: 61_000 },
        {
          limit: 3,
          windowMs: 60_000,
          now: 2_000,
        },
      ),
    ).toEqual({
      allowed: false,
      count: 3,
      resetAt: 61_000,
      retryAfterMs: 59_000,
    });
  });
});
