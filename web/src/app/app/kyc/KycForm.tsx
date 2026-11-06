"use client";
import { useActionState } from "react";
import { submitKyc } from "@/app/actions/customer";

type L = { dob: string; passportNo: string; nationality: string; passport: string; selfie: string; submit: string; done: string };

export function KycForm({ labels }: { labels: L }) {
  const [state, action, pending] = useActionState(submitKyc, undefined);
  if (state?.ok) return <div className="notice">{labels.done}</div>;
  const file = "block w-full rounded-xl border border-dashed border-line bg-paper p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:font-semibold file:text-white";
  return (
    <form action={action} className="space-y-4">
      {state?.error && <div className="error" role="alert">{state.error}</div>}
      <div>
        <label className="label" htmlFor="dob">{labels.dob}</label>
        <input id="dob" name="dateOfBirth" type="date" required className="input" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="pn">{labels.passportNo}</label>
          <input id="pn" name="passportNo" required className="input" autoComplete="off" />
        </div>
        <div>
          <label className="label" htmlFor="nat">{labels.nationality}</label>
          <input id="nat" name="nationality" required className="input" defaultValue="Rwanda" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="pp">{labels.passport}</label>
        <input id="pp" name="passport" type="file" required accept="image/*,application/pdf" className={file} />
      </div>
      <div>
        <label className="label" htmlFor="sf">{labels.selfie}</label>
        <input id="sf" name="selfie" type="file" required accept="image/*" capture="user" className={file} />
      </div>
      <button className="btn-primary w-full" disabled={pending}>{pending ? "…" : labels.submit}</button>
    </form>
  );
}
