import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { getDict } from "@/lib/i18n";
import { listBusinesses, listCities } from "@/lib/queries";
import { BUSINESS_CATEGORIES, categoryFromSlug } from "@/lib/labels";
import { BusinessCard } from "@/components/Cards";
import { EmptyState, PageHeader } from "@/components/Section";
import { FilterBar, Select } from "@/components/FilterBar";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Student services directory",
  description: "Accommodation, African food shops, restaurants, translation, tutoring and transport for African students in Russia — reviewed before listing.",
  alternates: { canonical: "/services" },
};

type SP = Promise<{ q?: string; city?: string; category?: string }>;

export default async function ServicesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { t } = await getDict();
  const cities = await listCities();
  const city = cities.find((c) => c.slug === sp.city);
  const category = categoryFromSlug(sp.category);
  const q = sp.q?.slice(0, 100).trim() || undefined;
  const list = await listBusinesses({ q, cityId: city?.id, category });
  const labels = { verified: t.common.verified, sponsored: t.common.sponsored, featured: t.common.featured };

  return (
    <>
      <PageHeader eyebrow="Directory" title="Services for African students" sub="Every listing is reviewed by our team before it appears. Sponsored listings are always labelled — and verification is never for sale.">
        <Link href="/list-your-business" className="btn-primary">{t.nav.listBusiness} <ArrowRight className="h-4 w-4" /></Link>
      </PageHeader>
      <div className="container-x py-10">
        <FilterBar action="/services" q={q} placeholder="Search by name or service" searchLabel={t.common.search}>
          <Select name="city" value={city?.slug} label={t.common.allCities} options={cities.map((c) => ({ value: c.slug, label: c.name }))} />
          <Select name="category" value={sp.category && category ? sp.category : undefined} label={t.common.allCategories} options={BUSINESS_CATEGORIES.map((c) => ({ value: c.slug, label: c.label }))} />
        </FilterBar>

        <div className="mt-6 flex flex-wrap gap-2">
          {BUSINESS_CATEGORIES.map((c) => {
            const active = c.value === category;
            const p = new URLSearchParams({ ...(q ? { q } : {}), ...(city ? { city: city.slug } : {}), ...(active ? {} : { category: c.slug }) }).toString();
            return (
              <Link key={c.value} href={`/services${p ? `?${p}` : ""}`} aria-current={active ? "true" : undefined} className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${active ? "bg-brand-600 text-white" : "bg-white text-ink ring-1 ring-line hover:ring-brand-300"}`}>
                {c.label}
              </Link>
            );
          })}
        </div>

        <p className="mt-6 text-sm text-muted" aria-live="polite">{list.length} {list.length === 1 ? "listing" : "listings"}</p>
        <div className="mt-3">
          {list.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{list.map((b) => <BusinessCard key={b.id} b={b} labels={labels} />)}</div>
          ) : (
            <EmptyState title={q || city || category ? t.common.noResults : "The first listings are being reviewed"}>
              Run a service for students? <Link href="/list-your-business" className="font-semibold text-brand-600 underline">Submit it for review</Link>.
            </EmptyState>
          )}
        </div>

        <aside className="mt-10 flex gap-3 rounded-2xl bg-white p-5 text-sm leading-6 text-muted ring-1 ring-line">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
          <p><strong className="text-ink">How listings work.</strong> “Verified” means our team checked the business exists and its contact details work. “Sponsored” means the business paid for a more visible position. “Team pick” is our free editorial choice. Always agree terms and prices directly with the business, and never pay a deposit before seeing a written agreement.</p>
        </aside>
      </div>
    </>
  );
}
