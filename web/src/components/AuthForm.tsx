"use client";
import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";

type Field = { name: string; label: string; type?: string; hint?: string; autoComplete?: string };

export function AuthForm({
  action,
  fields,
  submit,
  next,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  fields: Field[];
  submit: string;
  next?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <div className="error" role="alert">{state.error}</div>}
      {next && <input type="hidden" name="next" value={next} />}
      {fields.map((f) => (
        <div key={f.name}>
          <label className="label" htmlFor={f.name}>{f.label}</label>
          <input id={f.name} name={f.name} type={f.type ?? "text"} required autoComplete={f.autoComplete} className="input" />
          {f.hint && <p className="hint">{f.hint}</p>}
        </div>
      ))}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "…" : submit}</button>
    </form>
  );
}
