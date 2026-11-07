import type { Metadata } from "next";
import { PageHeader } from "@/components/Section";
import { TrustBadge, VerifiedBadge, SponsoredBadge, FeaturedBadge } from "@/components/Badges";
import { TRUST_LEVELS } from "@/lib/labels";

export const metadata: Metadata = { title: "How we check information", description: "How AfroStart Russia labels official, editorial, verified, student and sponsored information.", alternates: { canonical: "/trust" } };

export default function TrustPage() {
  return (
    <>
      <PageHeader eyebrow="Trust" title="How we check information" sub="Every piece of content on AfroStart carries a label that tells you where it came from." />
      <div className="container-x max-w-3xl space-y-10 py-12">
        <section>
          <h2 className="text-xl font-extrabold text-ink">Content labels</h2>
          <ul className="mt-4 space-y-3">
            {TRUST_LEVELS.map((t) => (
              <li key={t.value} className="card flex flex-col gap-2 p-5 sm:flex-row sm:items-start sm:gap-5">
                <div className="sm:w-48 sm:shrink-0"><TrustBadge trust={t.value} /></div>
                <p className="text-sm leading-6 text-muted">{t.explain}</p>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-extrabold text-ink">Business listings</h2>
          <ul className="mt-4 space-y-3">
            <li className="card flex flex-col gap-2 p-5 sm:flex-row sm:gap-5"><div className="sm:w-48 sm:shrink-0"><VerifiedBadge /></div><p className="text-sm leading-6 text-muted">Our team confirmed the business exists and its contact details work. Free, and never sold.</p></li>
            <li className="card flex flex-col gap-2 p-5 sm:flex-row sm:gap-5"><div className="sm:w-48 sm:shrink-0"><FeaturedBadge /></div><p className="text-sm leading-6 text-muted">An editorial pick by our team. Not paid.</p></li>
            <li className="card flex flex-col gap-2 p-5 sm:flex-row sm:gap-5"><div className="sm:w-48 sm:shrink-0"><SponsoredBadge /></div><p className="text-sm leading-6 text-muted">The business paid for a more visible position. Paying does not make a business verified.</p></li>
          </ul>
        </section>
        <section className="card p-6 text-sm leading-6 text-muted">
          <h2 className="mb-2 text-lg font-bold text-ink">Dates and limits</h2>
          <p>“Last verified” shows when we last checked the information against its source. “Not yet verified” means we have not checked it yet — treat it with care. Opportunities are automatically marked expired after their deadline.</p>
          <p className="mt-3">AfroStart does not give legal or immigration advice. For visas, migration registration, residence and university rules, always follow your university&apos;s international office and the official Russian authorities.</p>
        </section>
      </div>
    </>
  );
}
