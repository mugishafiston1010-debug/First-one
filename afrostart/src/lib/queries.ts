import "server-only";
import type { BusinessCategory, Prisma } from "@prisma/client";
import { db } from "./db";
import { activePlacementWhere, directorySort } from "./sponsorship";
import { openWhere } from "./opportunity-status";

/**
 * Public read layer. Every function here returns published content only,
 * so pages (and the future AI assistant) can never show drafts or unreviewed listings.
 */

export async function publishedCounts() {
  const [guides, cities, businesses] = await Promise.all([
    db.guide.count({ where: { published: true, locale: "en" } }),
    db.city.count({ where: { published: true } }),
    db.business.count({ where: { published: true } }),
  ]);
  return { guides, cities, businesses };
}

export async function listCities() {
  return db.city.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { universities: { where: { published: true } }, businesses: { where: { published: true } } } } },
  });
}

export async function getCity(slug: string) {
  return db.city.findFirst({
    where: { slug, published: true },
    include: {
      universities: { where: { published: true }, orderBy: { name: "asc" } },
      resources: { where: { published: true }, orderBy: [{ kind: "asc" }, { title: "asc" }] },
    },
  });
}

/** Guides in the reader's language; English is used where no translation exists. */
export async function listGuides(opts: { locale: string; q?: string; stage?: string; cityId?: string; take?: number }) {
  const where: Prisma.GuideWhereInput = {
    published: true,
    ...(opts.stage ? { category: { stage: opts.stage as never } } : {}),
    ...(opts.cityId ? { cityId: opts.cityId } : {}),
    ...(opts.q
      ? { OR: [{ title: { contains: opts.q, mode: "insensitive" } }, { summary: { contains: opts.q, mode: "insensitive" } }, { body: { contains: opts.q, mode: "insensitive" } }] }
      : {}),
  };
  const rows = await db.guide.findMany({
    where: { ...where, locale: { in: [...new Set(["en", opts.locale])] } },
    include: { category: true, city: { select: { name: true, slug: true } } },
    orderBy: [{ category: { sortOrder: "asc" } }, { publishedAt: "desc" }],
  });
  const bySlug = new Map<string, (typeof rows)[number]>();
  for (const g of rows) {
    const cur = bySlug.get(g.slug);
    if (!cur || g.locale === opts.locale) bySlug.set(g.slug, g);
  }
  const list = [...bySlug.values()];
  return opts.take ? list.slice(0, opts.take) : list;
}

export async function getGuide(slug: string, locale: string) {
  const rows = await db.guide.findMany({
    where: { slug, published: true, locale: { in: [...new Set(["en", locale])] } },
    include: { category: true, city: { select: { name: true, slug: true } }, sources: { orderBy: { sort: "asc" } } },
  });
  const guide = rows.find((g) => g.locale === locale) ?? rows.find((g) => g.locale === "en") ?? null;
  return guide ? { guide, isFallback: guide.locale !== locale } : null;
}

export async function listGuideCategories() {
  return db.guideCategory.findMany({ orderBy: [{ stage: "asc" }, { sortOrder: "asc" }] });
}

export async function listBusinesses(opts: { q?: string; cityId?: string; category?: BusinessCategory; take?: number; featuredOnly?: boolean }) {
  const now = new Date();
  const rows = await db.business.findMany({
    where: {
      published: true,
      ...(opts.cityId ? { cityId: opts.cityId } : {}),
      ...(opts.category ? { category: opts.category } : {}),
      ...(opts.featuredOnly ? { OR: [{ featured: true }, { placements: { some: activePlacementWhere("HOMEPAGE", now) } }] } : {}),
      ...(opts.q ? { OR: [{ name: { contains: opts.q, mode: "insensitive" } }, { description: { contains: opts.q, mode: "insensitive" } }] } : {}),
    },
    include: {
      city: { select: { name: true, slug: true } },
      placements: { where: { startsAt: { lte: now }, endsAt: { gte: now } }, select: { slot: true } },
    },
  });
  const slotFor = opts.featuredOnly ? "HOMEPAGE" : "DIRECTORY_TOP";
  const list = directorySort(rows.map((b) => ({ ...b, sponsored: b.placements.some((p) => p.slot === slotFor) })));
  return opts.take ? list.slice(0, opts.take) : list;
}

export async function getBusiness(slug: string) {
  const now = new Date();
  const b = await db.business.findFirst({
    where: { slug, published: true },
    include: { city: true, placements: { where: { startsAt: { lte: now }, endsAt: { gte: now } } } },
  });
  return b ? { ...b, sponsored: b.placements.length > 0 } : null;
}

export async function cityBusinesses(cityId: string) {
  const now = new Date();
  const rows = await db.business.findMany({
    where: { published: true, cityId },
    include: { city: { select: { name: true, slug: true } }, placements: { where: { slot: "CITY_PAGE", startsAt: { lte: now }, endsAt: { gte: now } }, select: { slot: true } } },
  });
  return directorySort(rows.map((b) => ({ ...b, sponsored: b.placements.length > 0 })));
}

/** Public opportunities: open ones first (soonest deadline), then recently expired/closed for reference. */
export async function listOpportunities(opts: { type?: string; includePast?: boolean; take?: number } = {}) {
  const typeFilter = opts.type ? { type: opts.type as never } : {};
  const open = await db.opportunity.findMany({
    where: { ...openWhere(), ...typeFilter },
    orderBy: [{ deadline: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    take: opts.take,
  });
  if (!opts.includePast) return { open, past: [] };
  const openIds = open.map((o) => o.id);
  const past = await db.opportunity.findMany({
    where: { status: { in: ["OPEN", "CLOSED"] }, id: { notIn: openIds }, ...typeFilter },
    orderBy: { deadline: { sort: "desc", nulls: "last" } },
    take: 30,
  });
  return { open, past };
}

export async function getOpportunity(slug: string) {
  return db.opportunity.findFirst({ where: { slug, status: { in: ["OPEN", "CLOSED"] } } });
}
