"use client";
import { keepValuesOnSubmit } from "@/lib/use-keep-form";
import { useActionState, useState } from "react";
import { CircleCheck } from "lucide-react";
import { submitBusiness, type FormState } from "@/app/actions/public";

type Opt = { value: string; label: string };

export function SubmissionForm({ cities, categories }: { cities: { id: string; name: string }[]; categories: Opt[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitBusiness, {});
  const [city, setCity] = useState(state.values?.cityId ?? "");
  const v = state.values ?? {};
  const e = state.errors ?? {};

  if (state.ok)
    return (
      <div className="card flex flex-col items-center p-10 text-center" role="status">
        <CircleCheck className="h-14 w-14 text-leaf-500" />
        <h2 className="mt-4 text-2xl font-extrabold text-ink">Thank you — submission received</h2>
        <p className="mt-2 max-w-md text-muted">Our team will review your business. We may email you to confirm details. Your listing will appear only after approval.</p>
      </div>
    );

  return (
    <form action={action} onSubmit={keepValuesOnSubmit(action)} className="card space-y-5 p-6 sm:p-8" noValidate>
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {state.message && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{state.message}</p>}

      <fieldset className="space-y-5">
        <legend className="text-lg font-bold text-ink">About the business</legend>
        <Field label="Business name" name="name" error={e.name} defaultValue={v.name} required maxLength={120} />
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className="label">Category *</label>
            <select id="category" name="category" defaultValue={v.category ?? ""} className="input" required aria-invalid={!!e.category}>
              <option value="" disabled>Choose…</option>
              {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            {e.category && <p className="error">Choose a category</p>}
          </div>
          <div>
            <label htmlFor="cityId" className="label">City *</label>
            <select id="cityId" name="cityId" value={city} onChange={(ev) => setCity(ev.target.value)} className="input" required aria-invalid={!!e.cityId}>
              <option value="" disabled>Choose…</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="other">Another city…</option>
            </select>
            {e.cityId && <p className="error">{e.cityId}</p>}
          </div>
        </div>
        {city === "other" && <Field label="City name" name="cityOther" error={e.cityOther} defaultValue={v.cityOther} maxLength={80} />}
        <div>
          <label htmlFor="description" className="label">Description *</label>
          <textarea id="description" name="description" rows={5} defaultValue={v.description} maxLength={1500} className="input" required aria-invalid={!!e.description} placeholder="What do you offer students? Languages spoken, prices range, areas served…" />
          {e.description ? <p className="error">{e.description}</p> : <p className="hint">30–1500 characters.</p>}
        </div>
        <Field label="Address (optional)" name="address" error={e.address} defaultValue={v.address} maxLength={200} />
        <Field label="Website or social media link (optional)" name="website" type="url" placeholder="https://" error={e.website} defaultValue={v.website} maxLength={500} />
      </fieldset>

      <fieldset className="space-y-5 border-t border-line pt-6">
        <legend className="text-lg font-bold text-ink">Contact for our review</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Your name" name="contactName" error={e.contactName} defaultValue={v.contactName} required maxLength={80} autoComplete="name" />
          <Field label="Email" name="contactEmail" type="email" error={e.contactEmail} defaultValue={v.contactEmail} required maxLength={160} autoComplete="email" />
        </div>
        <Field label="Phone (optional)" name="contactPhone" type="tel" error={e.contactPhone} defaultValue={v.contactPhone} maxLength={30} autoComplete="tel" />
      </fieldset>

      <label className="flex items-start gap-3 text-sm text-ink">
        <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 accent-brand-600" />
        <span>I confirm this information is accurate and I am allowed to submit this business. I agree AfroStart may contact me about this submission.</span>
      </label>
      {e.consent && <p className="error -mt-3">{e.consent}</p>}

      <button className="btn-primary w-full sm:w-auto" disabled={pending}>{pending ? "Sending…" : "Submit for review"}</button>
    </form>
  );
}

function Field({ label, name, error, required, ...rest }: { label: string; name: string; error?: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}{required && " *"}</label>
      <input id={name} name={name} className="input" required={required} aria-invalid={!!error} aria-describedby={error ? `${name}-err` : undefined} {...rest} />
      {error && <p id={`${name}-err`} className="error">{error}</p>}
    </div>
  );
}
