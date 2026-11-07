import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarClock, ExternalLink, Globe2, TriangleAlert } from "lucide-react";
import { getOpportunity } from "@/lib/queries";
import { opportunityTypeLabel } from "@/lib/labels";
import { effectiveStatus, daysLeft } from "@/lib/opportunity-status";
import { StatusPill } from "@/components/Cards";
import { TrustBadge } from "@/components/Badges";
import { fmtDate, VerifiedOn } from "@/components/Dates";
import { Breadcrumbs } from "@/components/Section";
import { Prose } from "@/components/Prose";
import { hostOf } from "@/lib/safe-url";

export const dynamic = "force-dynamic";
type P = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const { slug } = await params;
  const o = await getOpportunity(slug);
  if (!o) return { title: "Opportunity not found" };
  return { title: o.title, description: o.summary, alternates: { canonical: `/opportunities/${slug}` }, robots: effectiveStatus(o) === "OPEN" ? undefined : { index: false } };
}

export default async function OpportunityPage({ params }: { params: P }) {
  const { slug } = await params;
  const o = await getOpportunity(slug);
  if (!o) notFound();
  const s = effectiveStatus(o);
  const left = o.deadline && s === "OPEN" ? daysLeft(o.deadline) : null;

  return (
    <div className="container-x py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <Breadcrumbs items={[{ href: "/opportunities", label: "Opportunities" }, { label: o.title }]} />
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip bg-brand-950 text-white">{opportunityTypeLabel(o.type)}</span>
          <StatusPill o={o} />
          <TrustBadge trust={o.trust} />
        </div>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight text-ink sm:text-4xl">{o.title}</h1>
        <p className="mt-4 text-lg leading-8 text-muted">{o.summary}</p>

        {s !== "OPEN" && (
          <p className="mt-6 flex items-start gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {s === "EXPIRED" ? "The deadline for this opportunity has passed." : "This opportunity is closed."} It is kept here for reference. Check the official source for future rounds.
          </p>
        )}

        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="card p-5">
            <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted"><CalendarClock className="h-4 w-4" />Deadline</dt>
            <dd className="mt-2 font-display text-xl font-bold text-ink">{o.deadline ? fmtDate(o.deadline) : "See official source"}</dd>
            {left !== null && <dd className="mt-1 text-sm font-medium text-sun-700">{left === 0 ? "Closes today" : `${left} days left`}</dd>}
          </div>
          <div className="card p-5">
            <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted"><Globe2 className="h-4 w-4" />Who can apply</dt>
            <dd className="mt-2 font-semibold text-ink">{o.countryEligibility}</dd>
          </div>
        </dl>

        <section className="mt-10">
          <h2 className="text-xl font-extrabold text-ink">About</h2>
          <Prose text={o.description} className="mt-3" />
        </section>
        <section className="mt-10">
          <h2 className="text-xl font-extrabold text-ink">Eligibility</h2>
          <Prose text={o.eligibility} className="mt-3" />
        </section>

        <div className="mt-10 card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <p className="text-muted">Source: <a href={o.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-600 hover:underline">{o.sourceName}</a> <span className="text-muted">({hostOf(o.sourceUrl)})</span></p>
            <div className="mt-1"><VerifiedOn date={o.lastVerifiedAt} /></div>
          </div>
          {s === "OPEN" && <a href={o.applyUrl} target="_blank" rel="noopener noreferrer" className="btn-primary shrink-0">Apply on official site <ExternalLink className="h-4 w-4" /></a>}
        </div>
        <p className="mt-4 text-xs text-muted">Details can change. The official source is always the final authority. AfroStart is not involved in selection and never charges students for applications.</p>
      </div>
    </div>
  );
}
