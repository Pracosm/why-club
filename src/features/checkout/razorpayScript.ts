import { useEffect, useState } from "react";

export const RAZORPAY_STANDARD_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
export const RAZORPAY_MAGIC_SCRIPT_SRC = "https://checkout.razorpay.com/v1/magic-checkout.js";

export function useRazorpayScript(args: {
  keyId?: string;
  checkoutMode: "standard" | "magic";
}) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!args.keyId) {
      return;
    }

    if (window.Razorpay) {
      setIsReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src =
      args.checkoutMode === "magic"
        ? RAZORPAY_MAGIC_SCRIPT_SRC
        : RAZORPAY_STANDARD_SCRIPT_SRC;
    script.async = true;
    script.onload = () => setIsReady(true);
    script.onerror = () => setIsReady(false);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [args.checkoutMode, args.keyId]);

  return isReady;
}
