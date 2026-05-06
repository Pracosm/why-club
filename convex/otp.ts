import { mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { appError } from "./lib/errors";
import { resendEmail } from "./lib/email";
import { assertRateLimit, resolveRateLimit } from "./lib/rateLimit";
import {
  assertOtpPepper,
  generateOtpCode,
  hashOtpCode,
  isValidOtpCode,
  normalizeOtpCode,
  safeEqualHex,
} from "./lib/otpCodes";
import { assertValidEmail } from "./lib/emailValidation";
import { isProductionDeployment, readOptionalEnv } from "./lib/env";

const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const OTP_COOLDOWN_MS = 60 * 1000;
const OTP_SEND_WINDOW_MS = 60 * 60 * 1000;
const OTP_SEND_LIMIT = 5;
const OTP_VERIFY_WINDOW_MS = 15 * 60 * 1000;
const OTP_VERIFY_LIMIT = 10;

function getOtpPepper() {
  return assertOtpPepper(
    readOptionalEnv("OTP_HASH_PEPPER"),
    isProductionDeployment(),
  );
}

function requireValidEmail(value: string) {
  try {
    return assertValidEmail(value);
  } catch {
    throw appError("INVALID_EMAIL", "Enter a valid email address.");
  }
}

async function enforceAuthRateLimit(
  ctx: MutationCtx,
  args: {
    key: string;
    limit: number;
    windowMs: number;
  },
) {
  const now = Date.now();
  const existing = await ctx.db
    .query("authRateLimits")
    .withIndex("by_key", (q) => q.eq("key", args.key))
    .unique();
  const resolved = resolveRateLimit(existing, {
    limit: args.limit,
    windowMs: args.windowMs,
    now,
  });

  assertRateLimit(resolved);

  if (existing) {
    await ctx.db.patch(existing._id, {
      count: resolved.count,
      resetAt: resolved.resetAt,
      updatedAt: now,
    });
    return;
  }

  await ctx.db.insert("authRateLimits", {
    key: args.key,
    count: resolved.count,
    resetAt: resolved.resetAt,
    createdAt: now,
    updatedAt: now,
  });
}

export const sendOTP = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const email = requireValidEmail(args.email);
    await enforceAuthRateLimit(ctx, {
      key: `otp:send:${email}`,
      limit: OTP_SEND_LIMIT,
      windowMs: OTP_SEND_WINDOW_MS,
    });

    const oldOTP = await ctx.db
      .query("otpVerifications")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    const now = Date.now();

    if (oldOTP) {
      const timeSinceLastOTP = now - oldOTP.createdAt;
      if (timeSinceLastOTP < OTP_COOLDOWN_MS) {
        throw appError(
          "RATE_LIMITED",
          "Please wait before requesting another code.",
          {
            retryAfterMs: OTP_COOLDOWN_MS - timeSinceLastOTP,
          },
        );
      }
      await ctx.db.delete(oldOTP._id);
    }

    const code = generateOtpCode();
    const expiresAt = now + OTP_EXPIRY_MINUTES * 60 * 1000;
    const codeHash = await hashOtpCode({
      email,
      code,
      createdAt: now,
      pepper: getOtpPepper(),
    });

    await ctx.db.insert("otpVerifications", {
      email,
      codeHash,
      attempts: 0,
      expiresAt,
      createdAt: now,
    });

    try {
      await resendEmail({
        to: email,
        subject: "Your WhÿClub verification code",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #000;">Verify your email</h1>
            <p>Your WhÿClub verification code is:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <h2 style="letter-spacing: 8px; margin: 0; font-family: monospace; color: #000;">${code}</h2>
            </div>
            <p style="color: #666; font-size: 14px;">This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
            <p style="color: #666; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error("Failed to send OTP email:", error);
      if (isProductionDeployment()) {
        throw appError("EMAIL_DELIVERY_FAILED", "Could not send verification code.");
      }
    }

    return {
      success: true,
      message: "If the email can receive codes, a verification code has been sent.",
      expiresIn: OTP_EXPIRY_MINUTES * 60,
    };
  },
});

export const verifyOTP = mutation({
  args: {
    email: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const email = requireValidEmail(args.email);
    const code = normalizeOtpCode(args.code);
    await enforceAuthRateLimit(ctx, {
      key: `otp:verify:${email}`,
      limit: OTP_VERIFY_LIMIT,
      windowMs: OTP_VERIFY_WINDOW_MS,
    });

    if (!isValidOtpCode(code)) {
      throw appError("INVALID_OTP", "Invalid verification code.");
    }

    const otpRecord = await ctx.db
      .query("otpVerifications")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!otpRecord) {
      throw appError("INVALID_OTP", "Invalid verification code.");
    }

    if (Date.now() > otpRecord.expiresAt) {
      await ctx.db.delete(otpRecord._id);
      throw appError("INVALID_OTP", "Invalid verification code.");
    }

    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      await ctx.db.delete(otpRecord._id);
      throw appError("INVALID_OTP", "Invalid verification code.");
    }

    const incomingHash = await hashOtpCode({
      email,
      code,
      createdAt: otpRecord.createdAt,
      pepper: getOtpPepper(),
    });

    if (!safeEqualHex(otpRecord.codeHash, incomingHash)) {
      const nextAttempts = otpRecord.attempts + 1;
      if (nextAttempts >= MAX_ATTEMPTS) {
        await ctx.db.delete(otpRecord._id);
        throw appError("INVALID_OTP", "Invalid verification code.");
      }

      await ctx.db.patch(otpRecord._id, {
        attempts: nextAttempts,
      });
      throw appError("INVALID_OTP", "Invalid verification code.");
    }

    const now = Date.now();
    let userId: string;

    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        emailVerificationTime: now,
        updatedAt: now,
      });
      userId = existingUser._id;
    } else {
      userId = await ctx.db.insert("users", {
        email,
        emailVerificationTime: now,
        role: "customer",
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.delete(otpRecord._id);

    return {
      success: true,
      userId,
      message: "Email verified.",
    };
  },
});

export const checkOTPExpiry = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const email = requireValidEmail(args.email);

    const otpRecord = await ctx.db
      .query("otpVerifications")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!otpRecord) {
      return {
        retryAfterMs: 0,
      };
    }

    const retryAfterMs = Math.max(
      0,
      OTP_COOLDOWN_MS - (Date.now() - otpRecord.createdAt),
    );

    return {
      retryAfterMs,
    };
  },
});
