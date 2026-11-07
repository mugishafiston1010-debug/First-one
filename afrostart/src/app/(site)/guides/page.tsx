import type { Metadata } from "next";
import Link from "next/link";
import { getDict } from "@/lib/i18n";
import { listCities, listGuides } from "@/lib/queries";
import { GUIDE_STAGES } from "@/lib/labels";
import { GuideCard } from "@/components/Cards";
import { EmptyState, PageHeader } from "@/components/Section";
import { FilterBar, Select } from "@/components/FilterBar";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Student Resource Centre",
  description: "Practical guides for African students preparing to study in Russia, arriving in Russia, and managing student life.",
  alternates: { canonical: "/guides" },
};

type SP = Promise<{ q?: string; stage?: string; city?: string }>;

export default async function GuidesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { t, locale } = await getDict();
  const q = sp.q?.slice(0, 100).trim() || undefined;
  const stage = GUIDE_STAGES.find((s) => s.slug === sp.stage);
  const cities = await listCities();
  const city = cities.find((c) => c.slug === sp.city);
  const guides = await listGuides({ locale, q, stage: stage?.value, cityId: city?.id });
  const vl = { lastVerified: t.common.lastVerified, notVerified: t.common.notVerified };
  const filtered = !!(q || stage || city);

  return (
    <>
      <PageHeader eyebrow="Resource centre" title="Guides for every step of your journey" sub="Organised, source-linked guides. Each one shows where its information comes from and when we last checked it." />
      <div className="container-x py-10">
        <FilterBar action="/guides" q={q} placeholder="Search guides — e.g. accommodation, winter, SIM card" searchLabel={t.common.search}>
          {stage && <input type="hidden" name="stage" value={stage.slug} />}
          <Select name="city" value={city?.slug} label={t.common.allCities} options={cities.map((c) => ({ value: c.slug, label: c.name }))} />
        </FilterBar>

        <div className="mt-6 flex flex-wrap gap-2" role="list" aria-label="Stages">
          <StageLink href={qs({ q, city: city?.slug })} active={!stage}>All stages</StageLink>
          {GUIDE_STAGES.map((s) => (
            <StageLink key={s.value} href={qs({ q, city: city?.slug, stage: s.slug })} active={stage?.value === s.value}>{s.label}</StageLink>
          ))}
        </div>

        <div className="mt-8">
          {guides.length === 0 ? (
            <EmptyState title={filtered ? t.common.noResults : "Guides are on their way"} />
          ) : stage || filtered ? (
            <Grid>{guides.map((g) => <GuideCard key={g.id} guide={g} labels={vl} />)}</Grid>
          ) : (
            <div className="space-y-14">
              {GUIDE_STAGES.map((s) => {
                const list = guides.filter((g) => g.category.stage === s.value);
                if (!list.length) return null;
                return (
                  <section key={s.value} aria-labelledby={`stage-${s.slug}`}>
                    <h2 id={`stage-${s.slug}`} className="text-2xl font-extrabold text-ink">{s.label}</h2>
                    <p className="mb-5 mt-1 text-muted">{s.blurb}</p>
                    <Grid>{list.map((g) => <GuideCard key={g.id} guide={g} labels={vl} />)}</Grid>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function qs(p: Record<string, string | undefined>) {
  const u = new URLSearchParams(Object.entries(p).filter(([, v]) => v) as [string, string][]).toString();
  return `/guides${u ? `?${u}` : ""}`;
}
const Grid = ({ children }: { children: React.ReactNode }) => <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
function StageLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link role="listitem" href={href} aria-current={active ? "page" : undefined} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${active ? "bg-brand-600 text-white" : "bg-white text-ink ring-1 ring-line hover:ring-brand-300"}`}>
      {children}
    </Link>
  );
}
