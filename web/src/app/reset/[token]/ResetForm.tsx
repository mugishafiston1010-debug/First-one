"use client";
import Link from "next/link";
import { useActionState } from "react";
import { resetPassword } from "@/app/actions/reset";

type L = { password: string; confirm: string; button: string; hint: string; done: string; signin: string };

export function ResetForm({ token, labels }: { token: string; labels: L }) {
  const [state, action, pending] = useActionState(resetPassword, undefined);
  if (state?.done)
    return (
      <div className="space-y-4">
        <p className="notice">{labels.done}</p>
        <Link href="/signin" className="btn-primary w-full">{labels.signin}</Link>
      </div>
    );
  return (
    <form action={action} className="space-y-4">
      {state?.error && <div className="error">{state.error}</div>}
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="label" htmlFor="pw">{labels.password}</label>
        <input id="pw" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" />
        <p className="hint">{labels.hint}</p>
      </div>
      <div>
        <label className="label" htmlFor="pw2">{labels.confirm}</label>
        <input id="pw2" name="confirm" type="password" required minLength={8} autoComplete="new-password" className="input" />
      </div>
      <button className="btn-primary w-full" disabled={pending}>{pending ? "…" : labels.button}</button>
    </form>
  );
}
