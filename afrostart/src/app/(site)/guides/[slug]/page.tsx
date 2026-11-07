import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Info, MapPin } from "lucide-react";
import { getDict } from "@/lib/i18n";
import { getGuide } from "@/lib/queries";
import { Prose } from "@/components/Prose";
import { TrustBadge } from "@/components/Badges";
import { fmtDate, VerifiedOn } from "@/components/Dates";
import { Breadcrumbs } from "@/components/Section";
import { hostOf } from "@/lib/safe-url";
import { trustInfo } from "@/lib/labels";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";
type P = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const { slug } = await params;
  const { locale } = await getDict();
  const r = await getGuide(slug, locale);
  if (!r) return { title: "Guide not found" };
  return {
    title: r.guide.title,
    description: r.guide.summary,
    alternates: { canonical: `/guides/${slug}` },
    openGraph: { type: "article", title: r.guide.title, description: r.guide.summary, publishedTime: r.guide.publishedAt?.toISOString(), modifiedTime: r.guide.updatedAt.toISOString() },
  };
}

export default async function GuidePage({ params }: { params: P }) {
  const { slug } = await params;
  const { t, locale } = await getDict();
  const r = await getGuide(slug, locale);
  if (!r) notFound();
  const { guide: g, isFallback } = r;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: g.title,
    description: g.summary,
    datePublished: g.publishedAt?.toISOString(),
    dateModified: g.updatedAt.toISOString(),
    inLanguage: g.locale,
    publisher: { "@type": "Organization", name: "AfroStart Russia" },
    mainEntityOfPage: `${SITE_URL}/guides/${g.slug}`,
  };

  return (
    <article className="container-x py-10 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="mx-auto max-w-3xl">
        <Breadcrumbs items={[{ href: "/guides", label: t.nav.guides }, { href: `/guides?stage=${stageSlug(g.category.stage)}`, label: g.category.name }, { label: g.title }]} />
        <div className="flex flex-wrap items-center gap-2">
          <TrustBadge trust={g.trust} />
          {g.city && <Link href={`/cities/${g.city.slug}`} className="chip bg-white text-muted ring-1 ring-inset ring-line hover:text-brand-600"><MapPin className="h-3 w-3" />{g.city.name}</Link>}
          {g.country && <span className="chip bg-white text-muted ring-1 ring-inset ring-line">{g.country}</span>}
        </div>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight text-ink sm:text-4xl">{g.title}</h1>
        <p className="mt-4 text-lg leading-8 text-muted">{g.summary}</p>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-line py-3 text-xs text-muted">
          {g.publishedAt && <span>{t.common.published}: <time dateTime={g.publishedAt.toISOString()}>{fmtDate(g.publishedAt, locale)}</time></span>}
          <VerifiedOn date={g.lastVerifiedAt} locale={locale} labels={{ lastVerified: t.common.lastVerified, notVerified: t.common.notVerified }} />
        </div>

        {isFallback && (
          <p className="mt-6 rounded-xl bg-sun-50 px-4 py-3 text-sm text-sun-700 ring-1 ring-sun-100">This guide is not yet available in your language, so it is shown in English.</p>
        )}

        <Prose text={g.body} className="mt-8" />

        {g.sources.length > 0 && (
          <section className="mt-12 rounded-2xl bg-white p-6 ring-1 ring-line" aria-labelledby="sources">
            <h2 id="sources" className="text-lg font-bold text-ink">{t.common.sources}</h2>
            <ul className="mt-3 space-y-2">
              {g.sources.map((s) => (
                <li key={s.id}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="group inline-flex items-start gap-2 text-sm font-medium text-brand-600 hover:text-brand-800">
                    <ExternalLink className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{s.label} <span className="font-normal text-muted">— {hostOf(s.url)}</span></span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <aside className="mt-8 flex gap-3 rounded-2xl bg-brand-50 p-5 text-sm leading-6 text-brand-900">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
          <p><strong>{trustInfo(g.trust).label}.</strong> {trustInfo(g.trust).explain} {t.common.officialHelp} <Link href="/trust" className="font-semibold underline">How we check information</Link>.</p>
        </aside>
      </div>
    </article>
  );
}

const stageSlug = (s: string) => ({ BEFORE_TRAVEL: "before-travelling", AFTER_ARRIVAL: "after-arriving", STUDENT_LIFE: "student-life" })[s] ?? "";
