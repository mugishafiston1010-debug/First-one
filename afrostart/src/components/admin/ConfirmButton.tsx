"use client";
import { useTransition } from "react";

/** Runs a server action after a confirmation dialog. */
export function ConfirmButton({ action, confirm: question, children, className = "btn-ghost btn-sm" }: { action: () => Promise<void>; confirm?: string; children: React.ReactNode; className?: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} className={className} onClick={() => { if (!question || window.confirm(question)) start(() => action()); }}>
      {pending ? "…" : children}
    </button>
  );
}
