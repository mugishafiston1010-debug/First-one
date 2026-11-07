import "server-only";
import { db } from "./db";

/**
 * Knowledge layer for the future AI student assistant.
 *
 * The assistant must answer ONLY from published platform content and always cite it.
 * This module is the single place it reads from: it returns small, source-linked passages
 * with their trust level and last-verified date, so the model can flag stale information.
 * Plug an LLM in later by: (1) calling searchKnowledge(question), (2) passing the passages
 * as context with an instruction to cite `url` and refuse when nothing relevant is found.
 * A vector index (e.g. pgvector) can replace the keyword search here without changing callers.
 */
export type KnowledgePassage = {
  kind: "guide" | "city" | "opportunity" | "business";
  title: string;
  text: string;
  url: string;
  trust: string;
  lastVerifiedAt: Date | null;
  externalSources: string[];
};

export async function searchKnowledge(query: string, limit = 8): Promise<KnowledgePassage[]> {
  const words = query.toLowerCase().split(/\W+/).filter((w) => w.length > 2).slice(0, 8);
  if (!words.length) return [];
  const anyWord = (fields: string[]) => ({ OR: words.flatMap((w) => fields.map((f) => ({ [f]: { contains: w, mode: "insensitive" as const } }))) });

  const [guides, cities, opps, businesses] = await Promise.all([
    db.guide.findMany({ where: { published: true, locale: "en", ...anyWord(["title", "summary", "body"]) }, include: { sources: true }, take: limit }),
    db.city.findMany({ where: { published: true, ...anyWord(["name", "intro", "transportInfo"]) }, take: limit }),
    db.opportunity.findMany({ where: { status: "OPEN", ...anyWord(["title", "summary", "eligibility"]) }, take: limit }),
    db.business.findMany({ where: { published: true, ...anyWord(["name", "description"]) }, include: { city: true }, take: limit }),
  ]);

  const score = (s: string) => words.reduce((n, w) => n + (s.toLowerCase().includes(w) ? 1 : 0), 0);
  const passages: KnowledgePassage[] = [
    ...guides.map((g) => ({ kind: "guide" as const, title: g.title, text: `${g.summary}\n\n${g.body}`.slice(0, 2000), url: `/guides/${g.slug}`, trust: g.trust, lastVerifiedAt: g.lastVerifiedAt, externalSources: g.sources.map((s) => s.url) })),
    ...cities.map((c) => ({ kind: "city" as const, title: c.name, text: [c.intro, c.transportInfo].filter(Boolean).join("\n\n"), url: `/cities/${c.slug}`, trust: "EDITORIAL", lastVerifiedAt: c.lastVerifiedAt, externalSources: [] })),
    ...opps.map((o) => ({ kind: "opportunity" as const, title: o.title, text: `${o.summary}\nEligibility: ${o.eligibility}\nDeadline: ${o.deadline?.toISOString().slice(0, 10) ?? "see official source"}`, url: `/opportunities/${o.slug}`, trust: o.trust, lastVerifiedAt: o.lastVerifiedAt, externalSources: [o.sourceUrl] })),
    ...businesses.map((b) => ({ kind: "business" as const, title: `${b.name} (${b.city.name})`, text: b.description, url: `/services/${b.slug}`, trust: b.verified ? "VERIFIED_PROVIDER" : "UNVERIFIED", lastVerifiedAt: b.verifiedAt, externalSources: b.website ? [b.website] : [] })),
  ];
  return passages.sort((a, b) => score(b.title + b.text) - score(a.title + a.text)).slice(0, limit);
}
