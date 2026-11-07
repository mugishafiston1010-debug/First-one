"use client";
import { createContext, useActionState, useContext, useEffect, useRef } from "react";
import { CircleCheck } from "lucide-react";
import type { AdminFormState } from "@/app/actions/admin";
import { keepValuesOnSubmit } from "@/lib/use-keep-form";

const ErrCtx = createContext<Record<string, string>>({});
/** Prefix for element ids so several forms on one page never share an id. */
const IdCtx = createContext("");
const useFieldId = (name: string) => `${useContext(IdCtx)}f-${name}`;

/** Wraps a server action: shows a message, per-field errors, and optionally clears itself after success. */
export function AdminForm({
  action, children, submitLabel = "Save", resetOnSuccess = false, className = "", idPrefix = "",
}: {
  action: (s: AdminFormState, fd: FormData) => Promise<AdminFormState>;
  children: React.ReactNode;
  submitLabel?: string;
  resetOnSuccess?: boolean;
  className?: string;
  idPrefix?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok && resetOnSuccess) ref.current?.reset(); }, [state, resetOnSuccess]);
  const errCount = Object.keys(state.errors ?? {}).length;
  return (
    <IdCtx.Provider value={idPrefix}>
    <ErrCtx.Provider value={state.errors ?? {}}>
      <form ref={ref} action={formAction} onSubmit={keepValuesOnSubmit(formAction)} className={`space-y-5 ${className}`} noValidate>
        {state.message && (
          <p role="status" className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${state.ok ? "bg-leaf-50 text-leaf-700" : "bg-red-50 text-red-700"}`}>
            {state.ok && <CircleCheck className="h-4 w-4" />}{state.message}
          </p>
        )}
        {errCount > 0 && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">Please fix {errCount === 1 ? "the highlighted field" : `${errCount} highlighted fields`}.</p>}
        {children}
        <div className="flex items-center gap-3 pt-1">
          <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : submitLabel}</button>
        </div>
      </form>
    </ErrCtx.Provider>
    </IdCtx.Provider>
  );
}

type Base = { name: string; label: string; hint?: string; required?: boolean; className?: string };

function Wrap({ name, label, hint, required, className = "", children }: Base & { children: React.ReactNode }) {
  const err = useContext(ErrCtx)[name];
  const id = useFieldId(name);
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}{required && <span className="text-red-500"> *</span>}</label>
      {children}
      {err ? <p className="error">{err}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export function TextField(p: Base & { defaultValue?: string | number | null; type?: string; placeholder?: string; maxLength?: number }) {
  const err = useContext(ErrCtx)[p.name];
  return (
    <Wrap {...p}>
      <input id={useFieldId(p.name)} name={p.name} type={p.type ?? "text"} defaultValue={p.defaultValue ?? ""} placeholder={p.placeholder} maxLength={p.maxLength} className="input" aria-invalid={!!err} />
    </Wrap>
  );
}

export function TextArea(p: Base & { defaultValue?: string | null; rows?: number; placeholder?: string; mono?: boolean }) {
  const err = useContext(ErrCtx)[p.name];
  return (
    <Wrap {...p}>
      <textarea id={useFieldId(p.name)} name={p.name} rows={p.rows ?? 4} defaultValue={p.defaultValue ?? ""} placeholder={p.placeholder} className={`input ${p.mono ? "font-mono text-[13px]" : ""}`} aria-invalid={!!err} />
    </Wrap>
  );
}

export function SelectField(p: Base & { defaultValue?: string | null; options: { value: string; label: string }[]; empty?: string }) {
  const err = useContext(ErrCtx)[p.name];
  return (
    <Wrap {...p}>
      <select id={useFieldId(p.name)} name={p.name} defaultValue={p.defaultValue ?? ""} className="input" aria-invalid={!!err}>
        {p.empty !== undefined && <option value="">{p.empty}</option>}
        {p.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Wrap>
  );
}

export function DateField(p: Base & { defaultValue?: Date | null }) {
  const err = useContext(ErrCtx)[p.name];
  return (
    <Wrap {...p}>
      <input id={useFieldId(p.name)} name={p.name} type="date" defaultValue={p.defaultValue ? p.defaultValue.toISOString().slice(0, 10) : ""} className="input" aria-invalid={!!err} />
    </Wrap>
  );
}

export function Toggle({ name, label, hint, defaultChecked }: { name: string; label: string; hint?: string; defaultChecked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-white p-3.5 hover:border-brand-200">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 accent-brand-600" />
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function TodayButton({ target }: { target: string }) {
  const id = useFieldId(target);
  return (
    <button type="button" className="text-xs font-semibold text-brand-600 hover:underline" onClick={() => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) el.value = new Date().toISOString().slice(0, 10);
    }}>Set to today</button>
  );
}
