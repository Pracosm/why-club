import { useEffect, useRef, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { gsap } from "gsap";

interface VerifyOtpProps {
  email: string;
  redirectTo?: string;
  onSuccess?: () => void;
  onBack?: () => void;
}

const PRIMARY_BUTTON_STYLES =
  "group relative flex h-14 w-full items-center justify-center rounded-full bg-black text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50";

export default function VerifyOtp({
  email,
  redirectTo = "/account",
  onSuccess,
  onBack,
}: VerifyOtpProps) {
  const { signIn } = useAuthActions();
  const [code, setCode] = useState<string[]>(new Array(6).fill(""));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [resendTime, setResendTime] = useState(60);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const timer = resendTime > 0 && setInterval(() => setResendTime(t => t - 1), 1000);
    return () => { if (timer) clearInterval(timer); };
  }, [resendTime]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".animate-in",
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 1.2, stagger: 0.1, ease: "power4.out" }
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6).split("");
    if (!pastedData.every(char => /^\d$/.test(char))) return;

    const newCode = [...code];
    pastedData.forEach((char, i) => {
      if (i < 6) newCode[i] = char;
    });
    setCode(newCode);
    inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
  };

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const finalCode = code.join("");
    if (finalCode.length !== 6) {
      setError("Please enter all 6 digits.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await signIn("email", {
        email,
        code: finalCode,
        redirectTo,
      });
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || "Invalid verification code.");
      gsap.to(".digit-input", { x: 5, duration: 0.05, repeat: 5, yoyo: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendTime > 0) return;
    try {
      await signIn("email", { email, redirectTo: window.location.href });
      setResendTime(60);
      setError("");
    } catch (err: any) {
      setError("Failed to resend code. Please try again.");
    }
  };

  useEffect(() => {
    if (code.every(digit => digit !== "") && !isSubmitting) {
      handleVerify();
    }
  }, [code]);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#F7F4EE] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xl">
        <button
          onClick={onBack}
          className="animate-in mb-12 flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-[0.2em] text-black/40 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Change Email
        </button>

        <div className="space-y-12 text-center">
          <div className="space-y-4 animate-in">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.4em] text-black/30">
              Identity Verification
            </p>
            <h1 className="heading-condensed text-6xl md:text-8xl font-black uppercase tracking-tight text-black leading-none">
              Check your <br /> inbox.
            </h1>
            <p className="font-editorial text-sm text-black/55 max-w-sm mx-auto leading-relaxed">
              We've sent a 6-digit verification code to <span className="text-black font-bold">{email}</span>.
              Enter it below to continue.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-10 animate-in">
            <div className="flex justify-center gap-2 md:gap-4" onPaste={handlePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  value={digit}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  autoFocus={i === 0}
                  className="digit-input w-12 h-16 md:w-16 md:h-20 text-3xl md:text-4xl font-black text-center bg-white border border-black/5 rounded-2xl shadow-sm outline-none transition focus:border-black/20 focus:ring-4 focus:ring-black/5"
                />
              ))}
            </div>

            {error && (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-red-500/10 px-4 py-3 text-center text-xs font-bold text-red-600 max-w-xs mx-auto">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {error}
              </div>
            )}

            <div className="max-w-sm mx-auto">
              <button type="submit" disabled={isSubmitting} className={PRIMARY_BUTTON_STYLES}>
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="relative z-10 flex items-center gap-2">
                    Verify Code
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                )}
              </button>
            </div>
          </form>

          <footer className="animate-in pt-8">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-black/35">
              Didn't receive a code?{" "}
              {resendTime > 0 ? (
                <span className="text-black/20">Resend in {resendTime}s</span>
              ) : (
                <button
                  onClick={handleResend}
                  className="text-black border-b border-black/10 pb-0.5 hover:border-black transition-all"
                >
                  Resend Now
                </button>
              )}
            </p>
          </footer>
        </div>
      </div>

      <div className="absolute bottom-10 flex items-center gap-2 opacity-15 animate-in">
        <ShieldCheck className="w-4 h-4 text-black" />
        <span className="text-[0.5rem] font-black uppercase tracking-widest">End-to-End Encrypted Access</span>
      </div>
    </div>
  );
}
