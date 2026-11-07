"use client";
import { keepValuesOnSubmit } from "@/lib/use-keep-form";
import { useActionState } from "react";
import { CircleCheck, Send } from "lucide-react";
import { subscribe, type FormState } from "@/app/actions/public";

type L = { placeholder: string; consent: string; button: string; done: string };

export function NewsletterForm({ labels, locale }: { labels: L; locale: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(subscribe, {});
  if (state.ok)
    return (
      <p role="status" className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white">
        <CircleCheck className="h-5 w-5 text-leaf-500" /> {labels.done}
      </p>
    );
  return (
    <form action={action} onSubmit={keepValuesOnSubmit(action)} className="w-full max-w-md" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="nl-email" className="sr-only">Email</label>
        <input id="nl-email" name="email" type="email" required autoComplete="email" placeholder={labels.placeholder} defaultValue={state.values?.email} className="input flex-1 border-white/20 bg-white/95" aria-invalid={!!state.errors?.email} />
        <button className="btn-sun" disabled={pending}><Send className="h-4 w-4" />{labels.button}</button>
      </div>
      {state.errors?.email && <p className="mt-1 text-xs font-medium text-sun-300">{state.errors.email}</p>}
      <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-white/75">
        <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 rounded accent-sun-400" />
        <span>{labels.consent} <a href="/privacy" className="underline hover:text-white">Privacy</a></span>
      </label>
      {state.errors?.consent && <p className="mt-1 text-xs font-medium text-sun-300">{state.errors.consent}</p>}
      {state.message && <p className="mt-2 text-xs font-medium text-sun-300">{state.message}</p>}
    </form>
  );
}
