import type { Metadata } from "next";
import Link from "next/link";
import { listOpportunities } from "@/lib/queries";
import { OPPORTUNITY_TYPES } from "@/lib/labels";
import { OpportunityCard } from "@/components/Cards";
import { EmptyState, PageHeader } from "@/components/Section";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Scholarships and opportunities",
  description: "Scholarships, admissions, competitions, internships and programmes for African students in Russia — linked to official sources.",
  alternates: { canonical: "/opportunities" },
};

type SP = Promise<{ type?: string }>;

export default async function OpportunitiesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const type = OPPORTUNITY_TYPES.find((t) => t.value.toLowerCase() === sp.type?.toLowerCase());
  const { open, past } = await listOpportunities({ type: type?.value, includePast: true });
  return (
    <>
      <PageHeader eyebrow="Opportunities" title="Scholarships, programmes and more" sub="We only list opportunities we have checked on the official source. Always apply through the official link — never pay anyone to apply on your behalf." />
      <div className="container-x py-10">
        <div className="flex flex-wrap gap-2">
          <TypeLink href="/opportunities" active={!type}>All</TypeLink>
          {OPPORTUNITY_TYPES.map((t) => <TypeLink key={t.value} href={`/opportunities?type=${t.value.toLowerCase()}`} active={type?.value === t.value}>{t.label}</TypeLink>)}
        </div>
        <h2 className="mb-5 mt-8 text-xl font-extrabold text-ink">Open now</h2>
        {open.length ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{open.map((o) => <OpportunityCard key={o.id} o={o} />)}</div>
        ) : (
          <EmptyState title="No open opportunities right now">New opportunities are added after we check them on the official source. Subscribe on the home page to hear first.</EmptyState>
        )}
        {past.length > 0 && (
          <>
            <h2 className="mb-5 mt-14 text-xl font-extrabold text-ink">Closed or expired</h2>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{past.map((o) => <OpportunityCard key={o.id} o={o} />)}</div>
          </>
        )}
      </div>
    </>
  );
}

function TypeLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return <Link href={href} aria-current={active ? "page" : undefined} className={`rounded-full px-4 py-2 text-sm font-semibold ${active ? "bg-brand-600 text-white" : "bg-white text-ink ring-1 ring-line hover:ring-brand-300"}`}>{children}</Link>;
}
