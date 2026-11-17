"use client";
import { useActionState } from "react";
import { createResetLink } from "@/app/actions/reset";
import { CopyButton } from "./CopyButton";

/** Admin: make a password reset link and copy it to send to the customer. */
export function ResetLinkButton({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(createResetLink, undefined);
  if (state?.link)
    return (
      <div className="flex max-w-full items-center gap-2 rounded-lg bg-paper p-2 text-xs">
        <span className="num truncate">{state.link}</span>
        <CopyButton value={state.link} label="Copy" done="Copied" />
      </div>
    );
  return (
    <form action={action}>
      <input type="hidden" name="userId" value={userId} />
      {state?.error && <span className="text-xs text-danger">{state.error}</span>}
      <button className="btn-ghost py-2 text-sm" disabled={pending}>{pending ? "…" : "Password reset link"}</button>
    </form>
  );
}
