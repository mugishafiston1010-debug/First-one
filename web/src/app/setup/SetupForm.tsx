"use client";
import { useActionState } from "react";
import { runSetup } from "@/app/actions/setup";

export function SetupForm() {
  const [state, action, pending] = useActionState(runSetup, undefined);
  const f = (name: string, label: string, type = "text") => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} type={type} required className="input" />
    </div>
  );
  return (
    <form action={action} className="space-y-4">
      {state?.error && <div className="error">{state.error}</div>}
      {f("token", "Setup code (SETUP_TOKEN)", "password")}
      {f("fullName", "Your full name")}
      {f("email", "Admin email", "email")}
      {f("password", "Admin password (12+ characters)", "password")}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "…" : "Create admin"}</button>
    </form>
  );
}
