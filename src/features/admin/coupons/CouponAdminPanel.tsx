import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { formatInr } from "@/lib/utils";
import { api } from "../../../../convex/_generated/api";
import { couponFormToPayload, couponToForm, EMPTY_COUPON_FORM } from "../lib/adminForms";
import { EditorActions, Field, Select, SimpleManagerShell, StatusPill, TextInput } from "../components/AdminUi";
import type { CouponDoc, CouponFormState } from "../types";

export function CouponAdminPanel({ coupons }: { coupons: CouponDoc[] }) {
  const createCoupon = useMutation(api.coupons.create);
  const updateCoupon = useMutation(api.coupons.update);
  const [selected, setSelected] = useState<CouponDoc | null>(coupons[0] ?? null);
  const [form, setForm] = useState<CouponFormState>(EMPTY_COUPON_FORM);
  const [message, setMessage] = useState<string | null>(null);
  const [previewSubtotal, setPreviewSubtotal] = useState("2500");
  const [isSaving, setIsSaving] = useState(false);
  const preview = useQuery(
    api.coupons.previewForAdmin,
    form.code.trim()
      ? {
          code: form.code.trim(),
          subtotal: Number(previewSubtotal) || 0,
        }
      : "skip",
  );

  useEffect(() => {
    if (selected) {
      setForm(couponToForm(selected));
    }
  }, [selected]);

  async function save() {
    const payload = couponFormToPayload(form);
    setIsSaving(true);
    setMessage(null);

    try {
      if (selected) {
        await updateCoupon({ couponId: selected._id, ...payload });
        setMessage("Coupon updated.");
      } else {
        await createCoupon({ code: form.code.trim().toUpperCase(), ...payload });
        setMessage("Coupon created.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save coupon.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SimpleManagerShell
      title="Discounts"
      description="Manage coupon codes, minimum order value, usage limits, and expiry."
      actionLabel="Add Coupon"
      onCreate={() => {
        setSelected(null);
        setForm(EMPTY_COUPON_FORM);
      }}
      list={coupons.map((coupon) => (
        <button
          type="button"
          key={coupon._id}
          onClick={() => setSelected(coupon)}
          className={`flex w-full items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 text-left hover:bg-slate-50 ${
            selected?._id === coupon._id ? "bg-slate-50" : ""
          }`}
        >
          <span>
            <span className="block text-sm font-medium text-slate-950">{coupon.code}</span>
            <span className="mt-1 block text-xs text-slate-500">
              {coupon.discountType === "percentage" ? `${coupon.discountValue}%` : formatInr(coupon.discountValue)}
              {" "}off · used {coupon.usedCount}
            </span>
          </span>
          <StatusPill tone={coupon.isActive ? "success" : "neutral"}>
            {coupon.isActive ? "Active" : "Paused"}
          </StatusPill>
        </button>
      ))}
      editor={
        <div className="grid gap-4">
          <Field label="Code">
            <TextInput disabled={Boolean(selected)} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} />
          </Field>
          <Field label="Title">
            <TextInput value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Type">
              <Select value={form.discountType} onChange={(event) => setForm({ ...form, discountType: event.target.value as CouponFormState["discountType"] })}>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed amount</option>
              </Select>
            </Field>
            <Field label="Discount value">
              <TextInput type="number" value={form.discountValue} onChange={(event) => setForm({ ...form, discountValue: event.target.value })} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Minimum order">
              <TextInput type="number" value={form.minOrderValue} onChange={(event) => setForm({ ...form, minOrderValue: event.target.value })} />
            </Field>
            <Field label="Usage limit">
              <TextInput type="number" value={form.usageLimit} onChange={(event) => setForm({ ...form, usageLimit: event.target.value })} />
            </Field>
          </div>
          <Field label="Expiry">
            <TextInput type="date" value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} />
          </Field>
          <Field label="State">
            <Select value={form.isActive ? "active" : "paused"} onChange={(event) => setForm({ ...form, isActive: event.target.value === "active" })}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </Select>
          </Field>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <Field label="Preview subtotal">
                <TextInput type="number" value={previewSubtotal} onChange={(event) => setPreviewSubtotal(event.target.value)} />
              </Field>
              <StatusPill tone={preview?.ok ? "success" : "warning"}>
                {preview?.ok ? "Applies" : "Check coupon"}
              </StatusPill>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Discount</span>
                <span className="font-medium text-slate-950">{formatInr(preview?.discountAmount ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Final total</span>
                <span className="font-medium text-slate-950">{formatInr(preview?.finalTotal ?? (Number(previewSubtotal) || 0))}</span>
              </div>
              {preview?.message ? (
                <p className={preview.ok ? "text-emerald-700" : "text-amber-700"}>{preview.message}</p>
              ) : null}
            </div>
          </div>
          <EditorActions onSave={() => void save()} />
          {isSaving ? <p className="text-sm text-slate-500">Saving coupon...</p> : null}
          {message ? <p className="text-sm text-slate-500">{message}</p> : null}
        </div>
      }
    />
  );
}
