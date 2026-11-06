"use client";
import { useActionState } from "react";
import { uploadReceipt } from "@/app/actions/customer";

export function ReceiptUpload({ orderRef, labels }: { orderRef: string; labels: { title: string; hint: string; button: string } }) {
  const [state, action, pending] = useActionState(uploadReceipt, undefined);
  return (
    <form action={action} className="space-y-3">
      <h3 className="font-semibold">{labels.title}</h3>
      {state?.error && <div className="error" role="alert">{state.error}</div>}
      <input type="hidden" name="ref" value={orderRef} />
      <input
        name="file"
        type="file"
        required
        accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
        className="block w-full rounded-xl border border-dashed border-line bg-paper p-4 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:font-semibold file:text-white"
      />
      <p className="hint">{labels.hint}</p>
      <button className="btn-primary w-full" disabled={pending}>{pending ? "…" : labels.button}</button>
    </form>
  );
}
