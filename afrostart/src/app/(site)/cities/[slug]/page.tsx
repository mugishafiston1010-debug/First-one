import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Bus, ExternalLink, GraduationCap, House, MapPin, Store, Bookmark } from "lucide-react";
import type { CityResource, CityResourceKind } from "@prisma/client";
import { getDict } from "@/lib/i18n";
import { cityBusinesses, getCity, listGuides } from "@/lib/queries";
import { BusinessCard, GuideCard } from "@/components/Cards";
import { TrustBadge } from "@/components/Badges";
import { VerifiedOn } from "@/components/Dates";
import { Breadcrumbs, EmptyState } from "@/components/Section";
import { Prose } from "@/components/Prose";
import { safeHttpUrl, hostOf } from "@/lib/safe-url";

export const dynamic = "force-dynamic";
type P = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const { slug } = await params;
  const city = await getCity(slug);
  if (!city) return { title: "City not found" };
  const description = city.tagline ?? `Student life in ${city.name}: universities, transport, accommodation and services for African students.`;
  return { title: `Student life in ${city.name}`, description, alternates: { canonical: `/cities/${slug}` }, openGraph: { title: `Student life in ${city.name}`, description } };
}

const SECTIONS: { kind: CityResourceKind; title: string; Icon: typeof Bus }[] = [
  { kind: "ACCOMMODATION", title: "Accommodation resources", Icon: House },
  { kind: "TRANSPORT", title: "Getting around", Icon: Bus },
  { kind: "USEFUL_LOCATION", title: "Useful locations", Icon: MapPin },
  { kind: "LOCAL_RESOURCE", title: "Local resources", Icon: Bookmark },
  { kind: "OTHER", title: "More", Icon: Bookmark },
];

export default async function CityPage({ params }: { params: P }) {
  const { slug } = await params;
  const { t, locale } = await getDict();
  const city = await getCity(slug);
  if (!city) notFound();
  const [guides, businesses] = await Promise.all([listGuides({ locale, cityId: city.id }), cityBusinesses(city.id)]);
  const vl = { lastVerified: t.common.lastVerified, notVerified: t.common.notVerified };
  const food = businesses.filter((b) => b.category === "FOOD_GROCERY" || b.category === "RESTAURANT");
  const otherBiz = businesses.filter((b) => !food.includes(b));
  const nav = [
    ["intro", "Overview"],
    ["universities", "Universities"],
    ...(city.transportInfo || city.resources.some((r) => r.kind === "TRANSPORT") ? [["transport", "Transport"]] : []),
    ["resources", "Resources"],
    ["food", "African food"],
    ["services", "Services"],
    ["guides", "Guides"],
  ];

  return (
    <>
      <section className="relative overflow-hidden bg-brand-950 text-white">
        {city.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={city.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        )}
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-sun-500/25 blur-3xl" />
        <div className="container-x relative py-12 sm:py-16">
          <div className="[&_a]:text-white/70 [&_span]:text-white/90 [&_nav]:text-white/60"><Breadcrumbs items={[{ href: "/cities", label: t.nav.cities }, { label: city.name }]} /></div>
          {city.region && <p className="text-sm font-semibold uppercase tracking-wider text-sun-300">{city.region}</p>}
          <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">{city.name}</h1>
          {city.tagline && <p className="mt-3 max-w-2xl text-lg text-white/80">{city.tagline}</p>}
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <span className="chip bg-white/10 text-white"><GraduationCap className="h-3.5 w-3.5" />{city.universities.length} universities</span>
            <span className="chip bg-white/10 text-white"><Store className="h-3.5 w-3.5" />{businesses.length} services</span>
          </div>
          {city.imageCredit && <p className="mt-6 text-[11px] text-white/50">Photo: {city.imageCredit}</p>}
        </div>
      </section>

      <nav aria-label="On this page" className="sticky top-16 z-30 border-b border-line bg-white/90 backdrop-blur">
        <div className="container-x flex gap-1 overflow-x-auto py-2 [scrollbar-width:none]">
          {nav.map(([id, label]) => <a key={id} href={`#${id}`} className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-brand-50 hover:text-brand-700">{label}</a>)}
        </div>
      </nav>

      <div className="container-x space-y-16 py-12">
        <section id="intro" className="scroll-mt-32 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <h2 className="text-2xl font-extrabold text-ink">About {city.name}</h2>
            <Prose text={city.intro} className="mt-4" />
          </div>
          <aside className="card h-fit space-y-3 p-5 text-sm">
            <p className="font-semibold text-ink">About this page</p>
            <VerifiedOn date={city.lastVerifiedAt} locale={locale} labels={vl} />
            <p className="text-muted">City information is maintained by the AfroStart team. Spotted something outdated? Tell us through the <Link className="text-brand-600 underline" href="/about">contact details</Link>.</p>
          </aside>
        </section>

        <section id="universities" className="scroll-mt-32">
          <h2 className="mb-5 text-2xl font-extrabold text-ink">Universities</h2>
          {city.universities.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {city.universities.map((u) => {
                const url = safeHttpUrl(u.websiteUrl);
                return (
                  <div key={u.id} className="card flex flex-col p-5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><GraduationCap className="h-5 w-5" /></span>
                      <div>
                        <h3 className="font-bold leading-snug text-ink">{u.name}</h3>
                        {u.shortName && <p className="text-xs text-muted">{u.shortName}</p>}
                      </div>
                    </div>
                    {u.description && <p className="mt-3 text-sm text-muted">{u.description}</p>}
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
                      {url && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-800">Official website <ExternalLink className="h-3.5 w-3.5" /></a>}
                      <VerifiedOn date={u.lastVerifiedAt} labels={vl} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <EmptyState title="Universities will be added soon" />}
        </section>

        {(city.transportInfo || city.resources.some((r) => r.kind === "TRANSPORT")) && (
          <section id="transport" className="scroll-mt-32">
            <h2 className="mb-5 text-2xl font-extrabold text-ink">Getting around</h2>
            {city.transportInfo && <div className="card p-6"><Prose text={city.transportInfo} /></div>}
            <ResourceList items={city.resources.filter((r) => r.kind === "TRANSPORT")} vl={vl} />
          </section>
        )}

        <section id="resources" className="scroll-mt-32">
          <h2 className="mb-5 text-2xl font-extrabold text-ink">Local resources</h2>
          {city.resources.filter((r) => r.kind !== "TRANSPORT").length ? (
            <div className="space-y-8">
              {SECTIONS.filter((s) => s.kind !== "TRANSPORT").map((s) => {
                const items = city.resources.filter((r) => r.kind === s.kind);
                if (!items.length) return null;
                return (
                  <div key={s.kind}>
                    <h3 className="mb-3 flex items-center gap-2 font-bold text-ink"><s.Icon className="h-5 w-5 text-brand-600" />{s.title}</h3>
                    <ResourceList items={items} vl={vl} />
                  </div>
                );
              })}
            </div>
          ) : <EmptyState title="Local resources are being collected">We only publish resources we have checked.</EmptyState>}
        </section>

        <section id="food" className="scroll-mt-32">
          <h2 className="mb-5 text-2xl font-extrabold text-ink">African restaurants and food shops</h2>
          {food.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{food.map((b) => <BusinessCard key={b.id} b={b} />)}</div>
          ) : (
            <EmptyState title={`No reviewed food businesses in ${city.name} yet`}>
              Know one? <Link href="/list-your-business" className="font-semibold text-brand-600 underline">Suggest it</Link> — we review every listing before publishing.
            </EmptyState>
          )}
        </section>

        <section id="services" className="scroll-mt-32">
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2 className="text-2xl font-extrabold text-ink">Student services</h2>
            <Link href={`/services?city=${city.slug}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600">All in {city.name} <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {otherBiz.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{otherBiz.map((b) => <BusinessCard key={b.id} b={b} />)}</div>
          ) : <EmptyState title="No reviewed services here yet" />}
        </section>

        <section id="guides" className="scroll-mt-32">
          <h2 className="mb-5 text-2xl font-extrabold text-ink">Guides</h2>
          {guides.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{guides.map((g) => <GuideCard key={g.id} guide={g} labels={vl} />)}</div>
          ) : (
            <EmptyState title={`No ${city.name}-specific guides yet`}>
              <Link href="/guides" className="font-semibold text-brand-600 underline">Browse general guides</Link>
            </EmptyState>
          )}
        </section>
      </div>
    </>
  );
}

function ResourceList({ items, vl }: { items: CityResource[]; vl: { lastVerified: string; notVerified: string } }) {
  if (!items.length) return null;
  return (
    <ul className="mt-4 grid gap-4 md:grid-cols-2">
      {items.map((r) => {
        const url = safeHttpUrl(r.url);
        return (
          <li key={r.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-bold text-ink">{r.title}</h4>
              <TrustBadge trust={r.trust} />
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">{r.description}</p>
            {r.address && <p className="mt-2 flex items-center gap-1.5 text-sm text-ink"><MapPin className="h-4 w-4 text-muted" />{r.address}</p>}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600">{hostOf(url)} <ExternalLink className="h-3.5 w-3.5" /></a> : <span />}
              <VerifiedOn date={r.lastVerifiedAt} labels={vl} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
