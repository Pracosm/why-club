import { appError } from "./errors";

type RateLimitState = {
  count: number;
  resetAt: number;
};

type RateLimitConfig = {
  limit: number;
  windowMs: number;
  now: number;
};

export function resolveRateLimit(
  state: RateLimitState | null,
  config: RateLimitConfig,
) {
  if (!state || state.resetAt <= config.now) {
    return {
      allowed: true,
      count: 1,
      resetAt: config.now + config.windowMs,
      retryAfterMs: 0,
    };
  }

  if (state.count >= config.limit) {
    return {
      allowed: false,
      count: state.count,
      resetAt: state.resetAt,
      retryAfterMs: state.resetAt - config.now,
    };
  }

  return {
    allowed: true,
    count: state.count + 1,
    resetAt: state.resetAt,
    retryAfterMs: 0,
  };
}

export function assertRateLimit(result: ReturnType<typeof resolveRateLimit>) {
  if (result.allowed) {
    return;
  }

  throw appError("RATE_LIMITED", "Too many attempts. Try again later.", {
    retryAfterMs: result.retryAfterMs,
  });
}
