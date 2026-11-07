import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock, ExternalLink, Globe, Mail, MapPin, Phone, Send, MessageCircle, AtSign } from "lucide-react";
import { getBusiness } from "@/lib/queries";
import { businessCategoryLabel, BUSINESS_CATEGORIES } from "@/lib/labels";
import { FeaturedBadge, SponsoredBadge, VerifiedBadge } from "@/components/Badges";
import { Breadcrumbs } from "@/components/Section";
import { fmtDate } from "@/components/Dates";
import { safeHttpUrl, telegramUrl, whatsappUrl, hostOf } from "@/lib/safe-url";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";
type P = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const { slug } = await params;
  const b = await getBusiness(slug);
  if (!b) return { title: "Listing not found" };
  const title = `${b.name} — ${businessCategoryLabel(b.category)} in ${b.city.name}`;
  return { title, description: b.description.slice(0, 160), alternates: { canonical: `/services/${slug}` }, openGraph: { title, description: b.description.slice(0, 160) } };
}

export default async function BusinessPage({ params }: { params: P }) {
  const { slug } = await params;
  const b = await getBusiness(slug);
  if (!b) notFound();
  const website = safeHttpUrl(b.website);
  const tg = telegramUrl(b.telegram);
  const wa = whatsappUrl(b.whatsapp);
  const ig = b.instagram ? `https://instagram.com/${b.instagram.replace(/^@/, "").replace(/[^A-Za-z0-9._]/g, "")}` : null;
  const vk = b.vk ? safeHttpUrl(b.vk.startsWith("http") ? b.vk : `https://vk.com/${b.vk.replace(/[^A-Za-z0-9._]/g, "")}`) : null;
  const catSlug = BUSINESS_CATEGORIES.find((c) => c.value === b.category)?.slug;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: b.name,
    description: b.description,
    url: `${SITE_URL}/services/${b.slug}`,
    ...(b.address ? { address: { "@type": "PostalAddress", streetAddress: b.address, addressLocality: b.city.name, addressCountry: "RU" } } : {}),
    ...(b.phone ? { telephone: b.phone } : {}),
  };

  return (
    <div className="container-x py-10 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Breadcrumbs items={[{ href: "/services", label: "Services" }, { href: `/services?category=${catSlug}`, label: businessCategoryLabel(b.category) }, { label: b.name }]} />
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="card p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-50 to-sun-50 font-display text-3xl font-extrabold text-brand-700 ring-1 ring-line">
              {b.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.logoUrl} alt={`${b.name} logo`} className="h-full w-full object-cover" />
              ) : b.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-ink">{b.name}</h1>
              <p className="mt-1 text-muted">{businessCategoryLabel(b.category)} · <Link href={`/cities/${b.city.slug}`} className="hover:text-brand-600">{b.city.name}</Link></p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {b.sponsored && <SponsoredBadge />}
                {b.verified && <VerifiedBadge />}
                {b.featured && <FeaturedBadge />}
              </div>
            </div>
          </div>
          <p className="mt-8 whitespace-pre-line text-[15.5px] leading-7 text-slate-700">{b.description}</p>
          <p className="mt-8 border-t border-line pt-4 text-xs text-muted">
            Listed {b.publishedAt ? `on ${fmtDate(b.publishedAt)}` : ""}.{" "}
            {b.verified ? `Verified by the AfroStart team${b.verifiedAt ? ` on ${fmtDate(b.verifiedAt)}` : ""}.` : "Not yet verified by the AfroStart team — information was supplied by the business."}{" "}
            {b.sponsored && "This business currently pays for a sponsored placement."}
          </p>
        </div>

        <aside className="space-y-4">
          <div className="card p-6">
            <h2 className="font-bold text-ink">Contact</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {b.address && <Row icon={MapPin}>{b.address}, {b.city.name}</Row>}
              {b.openingHours && <Row icon={Clock}><span className="whitespace-pre-line">{b.openingHours}</span></Row>}
              {b.phone && <Row icon={Phone}><a href={`tel:${b.phone.replace(/[^\d+]/g, "")}`} className="text-brand-600 hover:underline">{b.phone}</a></Row>}
              {b.email && <Row icon={Mail}><a href={`mailto:${b.email}`} className="text-brand-600 hover:underline">{b.email}</a></Row>}
              {website && <Row icon={Globe}><a href={website} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-brand-600 hover:underline">{hostOf(website)} <ExternalLink className="h-3 w-3" /></a></Row>}
              {tg && <Row icon={Send}><a href={tg} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-600 hover:underline">Telegram</a></Row>}
              {wa && <Row icon={MessageCircle}><a href={wa} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-600 hover:underline">WhatsApp</a></Row>}
              {ig && <Row icon={AtSign}><a href={ig} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-600 hover:underline">Instagram</a></Row>}
              {vk && <Row icon={AtSign}><a href={vk} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-600 hover:underline">VK</a></Row>}
            </ul>
          </div>
          <div className="rounded-2xl bg-sun-50 p-5 text-sm leading-6 text-sun-700 ring-1 ring-sun-100">
            <strong>Stay safe.</strong> Agree prices in writing, and never send a deposit or documents before you have seen the place or a contract. Report a problem with this listing via our <Link href="/about" className="underline">contact page</Link>.
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ icon: Icon, children }: { icon: typeof MapPin; children: React.ReactNode }) {
  return <li className="flex items-start gap-2.5 text-ink"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted" />{children}</li>;
}
