import "server-only";
import { createHash } from "node:crypto";
import { db } from "./db";

export const sha256 = (t: string) => createHash("sha256").update(t).digest("hex");

/** A reset link that exists, is unused and not expired; otherwise null. */
export async function findValidReset(token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const r = await db.passwordReset.findUnique({ where: { tokenHash: sha256(token) } });
  if (!r || r.usedAt || r.expiresAt < new Date()) return null;
  return r;
}
