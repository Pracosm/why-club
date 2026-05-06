"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import clsx from "clsx";

type OTPAuthStep = "email" | "otp" | "success";

interface OTPAuthProps {
  onSuccess?: (userId: string) => void;
  onError?: (error: string) => void;
}

export function OTPAuth({ onSuccess, onError }: OTPAuthProps) {
  const [step, setStep] = useState<OTPAuthStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOTP] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const sendOTP = useMutation(api.otp.sendOTP);
  const verifyOTP = useMutation(api.otp.verifyOTP);

  useEffect(() => {
    if (step !== "otp" || countdown <= 0) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [countdown, step]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await sendOTP({ email: email.toLowerCase() });
      setStep("otp");
      setOTP("");
      setCountdown(result.expiresIn);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send OTP";
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!otp || otp.length !== 6) {
        throw new Error("Please enter a valid 6-digit code");
      }

      const result = await verifyOTP({
        email: email.toLowerCase(),
        code: otp,
      });

      setStep("success");
      onSuccess?.(result.userId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to verify OTP";
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError("");
    setLoading(true);

    try {
      const result = await sendOTP({ email: email.toLowerCase() });
      setOTP("");
      setCountdown(result.expiresIn);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to resend OTP";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (step === "success") {
    return (
      <div className="space-y-6 rounded-lg border border-black bg-white p-8">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-green-100 p-3">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-black">Verified!</h2>
          <p className="mt-2 text-sm text-neutral-600">Your email has been verified successfully.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-lg border border-black bg-white p-8">
      <div>
        <h2 className="text-2xl font-bold text-black">Sign in with OTP</h2>
        <p className="mt-2 text-sm text-neutral-600">
          {step === "email"
            ? "Enter your email to receive a verification code"
            : "Enter the 6-digit code sent to your email"}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {step === "email" ? (
        <form onSubmit={handleSendOTP} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-black">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={loading}
              className="mt-2 w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-black disabled:bg-neutral-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            className={clsx(
              "w-full rounded-lg px-4 py-2 font-medium text-white transition",
              loading || !email ? "bg-neutral-400 cursor-not-allowed" : "bg-black hover:bg-neutral-800"
            )}
          >
            {loading ? "Sending..." : "Send verification code"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-black">
              Verification code
            </label>
            <input
              id="otp"
              type="text"
              value={otp}
              onChange={(e) => setOTP(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              required
              disabled={loading || countdown === 0}
              className="mt-2 w-full rounded-lg border border-neutral-300 px-4 py-2 text-center text-3xl letter-spacing-wider outline-none focus:border-black disabled:bg-neutral-50"
            />
            {countdown > 0 ? (
              <p className="mt-2 text-xs text-neutral-600">
                Code expires in {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, "0")}
              </p>
            ) : (
              <p className="mt-2 text-xs text-red-600">Code expired</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6 || countdown === 0}
            className={clsx(
              "w-full rounded-lg px-4 py-2 font-medium text-white transition",
              loading || otp.length !== 6 || countdown === 0
                ? "bg-neutral-400 cursor-not-allowed"
                : "bg-black hover:bg-neutral-800"
            )}
          >
            {loading ? "Verifying..." : "Verify code"}
          </button>

          <button
            type="button"
            onClick={handleResendOTP}
            disabled={loading || countdown > 0}
            className="w-full text-sm text-neutral-600 underline hover:text-black disabled:opacity-50"
          >
            {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep("email");
              setError("");
              setOTP("");
            }}
            className="w-full text-sm text-neutral-600 underline hover:text-black"
          >
            Use different email
          </button>
        </form>
      )}
    </div>
  );
}
