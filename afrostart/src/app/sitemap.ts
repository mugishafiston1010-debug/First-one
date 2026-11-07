import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/site";
import { openWhere } from "@/lib/opportunity-status";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [guides, cities, businesses, opps] = await Promise.all([
    db.guide.findMany({ where: { published: true, locale: "en" }, select: { slug: true, updatedAt: true } }),
    db.city.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    db.business.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    db.opportunity.findMany({ where: openWhere(), select: { slug: true, updatedAt: true } }),
  ]);
  const staticPages = ["", "/guides", "/cities", "/services", "/opportunities", "/checklist", "/list-your-business", "/about", "/trust", "/privacy"];
  return [
    ...staticPages.map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.8 })),
    ...guides.map((g) => ({ url: `${SITE_URL}/guides/${g.slug}`, lastModified: g.updatedAt, priority: 0.7 })),
    ...cities.map((c) => ({ url: `${SITE_URL}/cities/${c.slug}`, lastModified: c.updatedAt, priority: 0.7 })),
    ...businesses.map((b) => ({ url: `${SITE_URL}/services/${b.slug}`, lastModified: b.updatedAt, priority: 0.5 })),
    ...opps.map((o) => ({ url: `${SITE_URL}/opportunities/${o.slug}`, lastModified: o.updatedAt, priority: 0.6 })),
  ];
}
