import { Search } from "lucide-react";

/** Plain GET form: works without JavaScript, gives shareable URLs and is crawlable. */
export function FilterBar({ action, q, placeholder, children, searchLabel }: { action: string; q?: string; placeholder: string; children?: React.ReactNode; searchLabel: string }) {
  return (
    <form action={action} method="get" role="search" className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
      <label className="relative flex-1">
        <span className="sr-only">{searchLabel}</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input name="q" defaultValue={q} placeholder={placeholder} className="input border-transparent pl-10 shadow-none" maxLength={100} />
      </label>
      {children}
      <button className="btn-primary">{searchLabel}</button>
    </form>
  );
}

export function Select({ name, value, label, options }: { name: string; value?: string; label: string; options: { value: string; label: string }[] }) {
  return (
    <label className="sm:w-48">
      <span className="sr-only">{label}</span>
      <select name={name} defaultValue={value ?? ""} className="input">
        <option value="">{label}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
