import Link from "next/link";
import { ArrowUpRight, CalendarClock, GraduationCap, MapPin, Store } from "lucide-react";
import type { Business, City, Guide, GuideCategory, Opportunity } from "@prisma/client";
import { FeaturedBadge, SponsoredBadge, TrustBadge, VerifiedBadge } from "./Badges";
import { fmtDate, VerifiedOn } from "./Dates";
import { businessCategoryLabel, opportunityTypeLabel } from "@/lib/labels";
import { daysLeft, effectiveStatus } from "@/lib/opportunity-status";

const CITY_GRADIENTS = [
  "from-brand-600 via-brand-700 to-brand-950",
  "from-sun-500 via-sun-600 to-brand-900",
  "from-leaf-600 via-brand-700 to-brand-950",
  "from-brand-500 via-violet-700 to-brand-950",
  "from-sky-500 via-brand-600 to-brand-950",
  "from-rose-500 via-sun-600 to-brand-900",
];

export function CityCard({ city, index = 0, unis, services }: { city: City; index?: number; unis?: number; services?: number }) {
  return (
    <Link href={`/cities/${city.slug}`} className="group card card-hover relative flex min-h-56 flex-col justify-end overflow-hidden p-0">
      {city.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={city.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${CITY_GRADIENTS[index % CITY_GRADIENTS.length]}`}>
          <svg className="absolute -right-6 -top-6 h-48 w-48 text-white/10" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1" />
            <circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth="1" />
            <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-brand-950/90 via-brand-950/30 to-transparent" />
      <div className="relative p-5 text-white">
        {city.region && <p className="text-xs font-medium uppercase tracking-wider text-white/70">{city.region}</p>}
        <h3 className="mt-1 text-2xl font-extrabold">{city.name}</h3>
        {city.tagline && <p className="mt-1 line-clamp-2 text-sm text-white/80">{city.tagline}</p>}
        {(unis !== undefined || services !== undefined) && (
          <div className="mt-3 flex gap-3 text-xs text-white/80">
            {unis !== undefined && <span className="inline-flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" />{unis} universities</span>}
            {services !== undefined && <span className="inline-flex items-center gap-1"><Store className="h-3.5 w-3.5" />{services} services</span>}
          </div>
        )}
      </div>
    </Link>
  );
}

export function GuideCard({ guide, labels }: { guide: Guide & { category: GuideCategory; city?: { name: string } | null }; labels?: { lastVerified: string; notVerified: string } }) {
  return (
    <Link href={`/guides/${guide.slug}`} className="group card card-hover flex flex-col p-5 sm:p-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-brand-600">{guide.category.name}</span>
        {guide.city && <span className="inline-flex items-center gap-1 text-xs text-muted"><MapPin className="h-3 w-3" />{guide.city.name}</span>}
      </div>
      <h3 className="text-lg font-bold leading-snug text-ink group-hover:text-brand-700">{guide.title}</h3>
      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-muted">{guide.summary}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
        <TrustBadge trust={guide.trust} />
        <VerifiedOn date={guide.lastVerifiedAt} labels={labels} />
      </div>
    </Link>
  );
}

type BizCardData = Business & { city: { name: string }; sponsored: boolean };
export function BusinessCard({ b, labels }: { b: BizCardData; labels?: { verified: string; sponsored: string; featured: string } }) {
  return (
    <Link href={`/services/${b.slug}`} className={`group card card-hover flex flex-col p-5 ${b.sponsored ? "ring-1 ring-sun-300" : ""}`}>
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-50 to-sun-50 font-display text-xl font-extrabold text-brand-700 ring-1 ring-line">
          {b.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.logoUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            b.name.slice(0, 1).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold text-ink group-hover:text-brand-700">{b.name}</h3>
          <p className="mt-0.5 text-xs text-muted">{businessCategoryLabel(b.category)} · {b.city.name}</p>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 flex-1 text-sm leading-6 text-muted">{b.description}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {b.sponsored && <SponsoredBadge label={labels?.sponsored} />}
        {b.verified && <VerifiedBadge label={labels?.verified} />}
        {b.featured && <FeaturedBadge label={labels?.featured} />}
      </div>
    </Link>
  );
}

export function StatusPill({ o }: { o: Pick<Opportunity, "status" | "deadline"> }) {
  const s = effectiveStatus(o);
  const map = {
    OPEN: "bg-leaf-50 text-leaf-700 ring-leaf-100",
    EXPIRED: "bg-slate-100 text-slate-600 ring-slate-200",
    CLOSED: "bg-slate-100 text-slate-600 ring-slate-200",
    DRAFT: "bg-sun-50 text-sun-700 ring-sun-100",
  } as const;
  const label = { OPEN: "Open", EXPIRED: "Expired", CLOSED: "Closed", DRAFT: "Draft" }[s];
  return <span className={`chip ring-1 ring-inset ${map[s]}`}>{label}</span>;
}

export function OpportunityCard({ o }: { o: Opportunity }) {
  const s = effectiveStatus(o);
  const left = o.deadline && s === "OPEN" ? daysLeft(o.deadline) : null;
  return (
    <Link href={`/opportunities/${o.slug}`} className={`group card card-hover flex flex-col p-5 sm:p-6 ${s !== "OPEN" ? "opacity-75" : ""}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="chip bg-brand-950 text-white">{opportunityTypeLabel(o.type)}</span>
        <StatusPill o={o} />
      </div>
      <h3 className="text-lg font-bold leading-snug text-ink group-hover:text-brand-700">{o.title}</h3>
      <p className="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-muted">{o.summary}</p>
      <div className="mt-4 space-y-1.5 border-t border-line pt-4 text-xs text-muted">
        <p className="inline-flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5" />
          {o.deadline ? <>Deadline: <strong className="text-ink">{fmtDate(o.deadline)}</strong>{left !== null && left <= 30 && <span className="font-semibold text-sun-700"> · {left === 0 ? "closes today" : `${left} days left`}</span>}</> : "Deadline: see official source"}
        </p>
        <p className="flex items-center gap-1.5 truncate"><ArrowUpRight className="h-3.5 w-3.5" />{o.sourceName}</p>
      </div>
    </Link>
  );
}
