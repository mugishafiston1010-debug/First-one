import Link from "next/link";
import { ArrowRight, BookOpen, CircleCheck, Compass, HeartHandshake, Plane, Quote, ShieldCheck, Sparkles, Store, House, GraduationCap } from "lucide-react";
import { getDict } from "@/lib/i18n";
import { listBusinesses, listCities, listGuides, listOpportunities, publishedCounts } from "@/lib/queries";
import { BusinessCard, CityCard, GuideCard, OpportunityCard } from "@/components/Cards";
import { EmptyState, SectionHeading } from "@/components/Section";
import { NewsletterForm } from "@/components/NewsletterForm";
import { GUIDE_STAGES } from "@/lib/labels";
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION } from "@/lib/site";

export const dynamic = "force-dynamic";

const STAGE_ICONS = { BEFORE_TRAVEL: Plane, AFTER_ARRIVAL: House, STUDENT_LIFE: GraduationCap } as const;

/** Clearly marked sample testimonials. Replace with real, consented student stories. */
const SAMPLE_TESTIMONIALS = [
  { quote: "Having every step in one checklist would have saved me weeks of asking around in group chats.", who: "Sample student", where: "First-year, engineering" },
  { quote: "Knowing which services other students actually checked makes finding housing far less stressful.", who: "Sample student", where: "Preparatory faculty" },
  { quote: "I want my younger cousins to find the official links first, not rumours.", who: "Sample student", where: "Master's programme" },
];

export default async function HomePage() {
  const { t, locale } = await getDict();
  const [counts, cities, guides, services, opps] = await Promise.all([
    publishedCounts(),
    listCities(),
    listGuides({ locale, take: 6 }),
    listBusinesses({ featuredOnly: true, take: 6 }),
    listOpportunities({ take: 3 }),
  ]);
  const vl = { lastVerified: t.common.lastVerified, notVerified: t.common.notVerified };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/guides?q={query}`, "query-input": "required name=query" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-950 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 top-0 h-[36rem] w-[36rem] rounded-full bg-brand-600/40 blur-3xl" />
          <div className="absolute -right-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-sun-500/25 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        </div>
        <div className="container-x relative grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:py-28">
          <div className="animate-rise">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-sun-300">
              <Sparkles className="h-3.5 w-3.5" /> {t.home.eyebrow}
            </p>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
              {t.home.title}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/75">{t.home.subtitle}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/guides" className="btn-sun px-6 py-3.5 text-base">{t.home.ctaGuides} <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/checklist" className="btn border border-white/20 bg-white/5 px-6 py-3.5 text-base text-white hover:bg-white/10">{t.home.ctaChecklist}</Link>
            </div>
            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-white/10 pt-6">
              {[[counts.guides, t.home.statGuides], [counts.cities, t.home.statCities], [counts.businesses, t.home.statServices]].map(([n, l]) => (
                <div key={String(l)}>
                  <dt className="text-xs text-white/60">{l}</dt>
                  <dd className="font-display text-3xl font-extrabold">{n}</dd>
                </div>
              ))}
            </dl>
          </div>
          <HeroPanel />
        </div>
      </section>

      {/* Resources */}
      <section className="container-x py-16 sm:py-20">
        <SectionHeading eyebrow={t.nav.guides} title={t.home.resourcesTitle} sub={t.home.resourcesSub} href="/guides" linkLabel={t.home.viewAll} />
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {GUIDE_STAGES.map((s) => {
            const Icon = STAGE_ICONS[s.value];
            return (
              <Link key={s.value} href={`/guides?stage=${s.slug}`} className="group card card-hover flex items-center gap-4 p-5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white"><Icon className="h-6 w-6" /></span>
                <span>
                  <span className="block font-display font-bold text-ink">{s.label}</span>
                  <span className="block text-sm text-muted">{s.blurb}</span>
                </span>
              </Link>
            );
          })}
        </div>
        {guides.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{guides.map((g) => <GuideCard key={g.id} guide={g} labels={vl} />)}</div>
        ) : (
          <EmptyState title="Guides are on their way" />
        )}
      </section>

      {/* Cities */}
      <section className="bg-white py-16 sm:py-20">
        <div className="container-x">
          <SectionHeading eyebrow={t.nav.cities} title={t.home.citiesTitle} sub={t.home.citiesSub} href="/cities" linkLabel={t.home.viewAll} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {cities.slice(0, 8).map((c, i) => <CityCard key={c.id} city={c} index={i} unis={c._count.universities} />)}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="container-x py-16 sm:py-20">
        <SectionHeading eyebrow={t.nav.services} title={t.home.servicesTitle} sub={t.home.servicesSub} href="/services" linkLabel={t.home.viewAll} />
        {services.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((b) => <BusinessCard key={b.id} b={b} labels={{ verified: t.common.verified, sponsored: t.common.sponsored, featured: t.common.featured }} />)}
          </div>
        ) : (
          <EmptyState title={t.home.servicesEmpty}>
            <Link href="/list-your-business" className="btn-primary mt-4">{t.nav.listBusiness} <ArrowRight className="h-4 w-4" /></Link>
          </EmptyState>
        )}
      </section>

      {/* Opportunities */}
      <section className="bg-white py-16 sm:py-20">
        <div className="container-x">
          <SectionHeading eyebrow={t.nav.opportunities} title={t.home.opportunitiesTitle} sub={t.home.opportunitiesSub} href="/opportunities" linkLabel={t.home.viewAll} />
          {opps.open.length ? (
            <div className="grid gap-5 md:grid-cols-3">{opps.open.map((o) => <OpportunityCard key={o.id} o={o} />)}</div>
          ) : (
            <EmptyState title={t.home.opportunitiesEmpty} />
          )}
        </div>
      </section>

      {/* Why */}
      <section className="container-x py-16 sm:py-20">
        <SectionHeading eyebrow="AfroStart" title={t.home.whyTitle} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [ShieldCheck, t.home.why1t, t.home.why1],
            [HeartHandshake, t.home.why2t, t.home.why2],
            [Store, t.home.why3t, t.home.why3],
            [BookOpen, t.home.why4t, t.home.why4],
          ].map(([Icon, title, body], i) => {
            const I = Icon as typeof ShieldCheck;
            return (
              <div key={i} className="card p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm"><I className="h-5 w-5" /></span>
                <h3 className="mt-4 font-bold text-ink">{title as string}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{body as string}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Testimonials (sample) */}
      <section className="bg-white py-16 sm:py-20">
        <div className="container-x">
          <SectionHeading eyebrow={t.home.testimonialsNote} title={t.home.testimonialsTitle} />
          <div className="grid gap-5 md:grid-cols-3">
            {SAMPLE_TESTIMONIALS.map((s, i) => (
              <figure key={i} className="card relative p-6">
                <span className="absolute right-4 top-4 chip bg-sun-50 text-sun-700 ring-1 ring-inset ring-sun-100">Sample</span>
                <Quote className="h-7 w-7 text-brand-200" />
                <blockquote className="mt-3 text-[15px] leading-7 text-ink">“{s.quote}”</blockquote>
                <figcaption className="mt-4 text-sm"><span className="font-semibold text-ink">{s.who}</span> <span className="text-muted">· {s.where}</span></figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="container-x pt-16 sm:pt-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 px-6 py-12 sm:px-12">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-sun-400/20 blur-3xl" />
          <div className="relative grid items-center gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-extrabold text-white sm:text-3xl">{t.newsletter.title}</h2>
              <p className="mt-3 max-w-lg text-white/75">{t.newsletter.sub}</p>
            </div>
            <NewsletterForm labels={t.newsletter} locale={locale} />
          </div>
        </div>
      </section>
    </>
  );
}

function HeroPanel() {
  const steps = [
    { icon: Compass, title: "Choose your city", sub: "Universities, transport, local resources" },
    { icon: CircleCheck, title: "Follow the checklist", sub: "From admission letter to first week" },
    { icon: Store, title: "Find trusted services", sub: "Reviewed before they are listed" },
  ];
  return (
    <div className="relative hidden lg:block animate-rise [animation-delay:150ms]">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
        <p className="text-sm font-semibold text-white/80">Your journey</p>
        <ol className="mt-5 space-y-3">
          {steps.map((s, i) => (
            <li key={i} className="flex items-center gap-4 rounded-2xl bg-white p-4 text-ink shadow-lg">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><s.icon className="h-5 w-5" /></span>
              <span>
                <span className="block text-sm font-bold">{s.title}</span>
                <span className="block text-xs text-muted">{s.sub}</span>
              </span>
              <span className="ml-auto font-display text-2xl font-extrabold text-brand-100">0{i + 1}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
