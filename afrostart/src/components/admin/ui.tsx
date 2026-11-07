import Link from "next/link";

export function AdminHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card p-5 sm:p-6 ${className}`}>
      {title && <h2 className="mb-4 font-bold text-ink">{title}</h2>}
      {children}
    </section>
  );
}

export function Pill({ tone, children }: { tone: "green" | "gray" | "amber" | "blue" | "red"; children: React.ReactNode }) {
  const c = { green: "bg-leaf-50 text-leaf-700", gray: "bg-slate-100 text-slate-600", amber: "bg-sun-50 text-sun-700", blue: "bg-brand-50 text-brand-700", red: "bg-red-50 text-red-700" }[tone];
  return <span className={`chip ${c}`}>{children}</span>;
}

export function Table({ head, children, empty }: { head: string[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-line bg-canvas text-xs uppercase tracking-wide text-muted">
          <tr>{head.map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
      {empty && <p className="p-8 text-center text-sm text-muted">Nothing here yet.</p>}
    </div>
  );
}

export function NewButton({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="btn-primary">{children}</Link>;
}

export function Saved({ show, text = "Saved." }: { show: boolean; text?: string }) {
  return show ? <p className="mb-4 rounded-lg bg-leaf-50 px-3 py-2 text-sm font-medium text-leaf-700">{text}</p> : null;
}
