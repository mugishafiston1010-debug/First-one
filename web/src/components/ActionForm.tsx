"use client";
import { useActionState } from "react";

type S = { error?: string; ok?: string } | undefined;

export function ActionForm({
  action,
  children,
  submit,
  className = "space-y-3",
  danger,
}: {
  action: (s: S, f: FormData) => Promise<S>;
  children: React.ReactNode;
  submit: string;
  className?: string;
  danger?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className}>
      {state?.error && <div className="error">{state.error}</div>}
      {state?.ok && <div className="notice">{state.ok}</div>}
      {children}
      <button className={danger ? "btn-danger w-full" : "btn-primary w-full"} disabled={pending}>{pending ? "…" : submit}</button>
    </form>
  );
}
