import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";

/** In-memory sliding window. Fine for one server; for several instances back it with Redis. */
const hits = new Map<string, number[]>();

export function tooMany(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 10_000) hits.clear(); // memory guard
  return list.length > max;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

/** Salted hash so raw IP addresses are never stored. */
export function hashIp(ip: string): string {
  return createHash("sha256")
    .update(`${process.env.IP_HASH_SALT ?? "afrostart"}:${ip}`)
    .digest("hex")
    .slice(0, 32);
}
