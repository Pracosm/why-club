import { formatInr } from "@/lib/utils";
import type { DisplayItem } from "./types";

type CheckoutSummaryProps = {
  displayItems: DisplayItem[];
  subtotal: number;
  couponCode: string;
  setCouponCode: (value: string) => void;
  statusMessage: string | null;
  errorMessage: string | null;
  isSubmitting: boolean;
  onSubmit: () => void | Promise<void>;
  actionLabel: string;
  ctaDisabled?: boolean;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void | Promise<void>;
};

export function CheckoutSummary({
  displayItems,
  subtotal,
  couponCode,
  setCouponCode,
  statusMessage,
  errorMessage,
  isSubmitting,
  onSubmit,
  actionLabel,
  ctaDisabled,
  secondaryActionLabel,
  onSecondaryAction,
}: CheckoutSummaryProps) {
  const total = subtotal;

  return (
    <div className="rounded-[1.5rem] border border-black/5 bg-white p-8 shadow-sm">
      <h3 className="mb-6 font-editorial text-xs font-bold uppercase tracking-widest text-black">Order Summary</h3>

      <div className="mb-6 flex flex-col gap-4">
        {displayItems.map((item) => (
          <div key={`${item.productSlug}-${item.size}`} className="flex items-center gap-4">
            <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-[#F5F5F5]">
              <img src={item.imageUrl} alt={item.productTitle} className="h-full w-full object-cover object-top" />
            </div>
            <div className="flex flex-1 flex-col">
              <h4 className="font-editorial text-[0.65rem] font-bold uppercase tracking-widest text-black">{item.productTitle}</h4>
              <span className="font-editorial text-[0.6rem] text-black/50">{item.material} / {item.size}</span>
            </div>
            <span className="font-editorial text-sm font-bold text-black">{formatInr(item.unitPrice * item.quantity)}</span>
          </div>
        ))}
      </div>

      <div className="mb-6 flex flex-col gap-4 border-y border-black/5 py-6">
        <div className="flex gap-2">
          <input
            value={couponCode}
            onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
            className="min-w-0 flex-1 rounded-lg border border-black/10 bg-[#F9F9F9] px-3 py-2 text-[0.65rem] font-bold uppercase tracking-widest text-black outline-none transition-colors focus:border-black"
            placeholder="Coupon code"
          />
          <span className="flex items-center rounded-lg border border-black/10 px-3 text-[0.6rem] font-bold uppercase tracking-widest text-black/40">
            Applied server-side
          </span>
        </div>
        <div className="flex justify-between font-editorial text-[0.75rem] text-black/70">
          <span>Subtotal</span>
          <span className="font-semibold text-black">{formatInr(subtotal)}</span>
        </div>
        <div className="flex justify-between font-editorial text-[0.75rem] text-black/70">
          <span>Shipping</span>
          <span className="font-semibold text-black">FREE</span>
        </div>
        <div className="flex justify-between font-editorial text-[0.75rem] text-black/70">
          <span>Discount</span>
          <span className="font-semibold text-green-600">- {formatInr(0)}</span>
        </div>
      </div>

      <div className="mb-8 flex items-end justify-between">
        <span className="font-editorial text-sm font-bold text-black">Total</span>
        <span className="text-2xl font-black leading-none text-black">{formatInr(total)}</span>
      </div>

      <button
        type="button"
        disabled={ctaDisabled || isSubmitting}
        onClick={() => void onSubmit()}
        className="group mb-6 flex h-14 w-full items-center justify-center rounded-lg bg-black text-[0.75rem] font-bold uppercase tracking-widest text-white transition-transform hover:bg-black/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Processing..." : actionLabel}
      </button>

      {secondaryActionLabel && onSecondaryAction ? (
        <button
          type="button"
          onClick={() => void onSecondaryAction()}
          className="mb-4 flex h-11 w-full items-center justify-center rounded-lg border border-black/10 bg-white text-[0.65rem] font-bold uppercase tracking-widest text-black transition-colors hover:bg-[#F5F5F5]"
        >
          {secondaryActionLabel}
        </button>
      ) : null}

      <div className="flex items-center justify-center gap-1.5 text-[0.6rem] font-medium text-black/40">
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span>Secure payment powered by</span>
        <strong className="ml-0.5 font-bold italic text-blue-900">Razorpay</strong>
      </div>

      {(statusMessage || errorMessage) && (
        <div className={`mt-6 rounded-lg px-4 py-3 text-[0.65rem] font-bold uppercase leading-relaxed tracking-widest ${errorMessage ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
          {errorMessage ?? statusMessage}
        </div>
      )}
    </div>
  );
}
