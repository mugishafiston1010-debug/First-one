import "server-only";

/** Simple in-memory limiter. Good for one server; use Redis when running several. */
const hits = new Map<string, number[]>();

export function tooMany(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  return list.length > max;
}
