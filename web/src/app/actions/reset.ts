"use server";
import { randomBytes } from "node:crypto";
import { addHours } from "date-fns";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { appUrl } from "@/lib/notify";
import { audit } from "@/lib/audit";
import { tooMany } from "@/lib/rate-limit";
import { findValidReset, sha256 } from "@/lib/reset";


export type ResetLinkState = { link?: string; error?: string } | undefined;

/** Admin: make a one-time link (24 h) to send to a customer who forgot their password. */
export async function createResetLink(_: ResetLinkState, form: FormData): Promise<ResetLinkState> {
  const admin = await requireAdmin();
  const userId = String(form.get("userId"));
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found" };
  // Old unused links stop working when a new one is made.
  await db.passwordReset.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
  const token = randomBytes(24).toString("base64url");
  await db.passwordReset.create({ data: { userId, tokenHash: sha256(token), expiresAt: addHours(new Date(), 24), createdBy: admin.id } });
  await audit(admin.id, "user.reset_link", userId);
  return { link: `${appUrl()}/reset/${token}` };
}

export type ResetState = { error?: string; done?: boolean } | undefined;

const schema = z.object({ token: z.string(), password: z.string().min(8).max(200), confirm: z.string() });

/** Customer: set the new password with the link. */
export async function resetPassword(_: ResetState, form: FormData): Promise<ResetState> {
  const { t } = await getT();
  const p = schema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: t("auth.passwordHint") };
  if (p.data.password !== p.data.confirm) return { error: t("reset.mismatch") };
  if (tooMany(`reset:${p.data.token.slice(0, 12)}`, 10, 60 * 60_000)) return { error: t("auth.tooMany") };
  const r = await findValidReset(p.data.token);
  if (!r) return { error: t("reset.invalid") };
  // Mark used first so the link can never work twice, even with two clicks at once.
  const used = await db.passwordReset.updateMany({ where: { id: r.id, usedAt: null }, data: { usedAt: new Date() } });
  if (!used.count) return { error: t("reset.invalid") };
  await db.user.update({ where: { id: r.userId }, data: { passwordHash: await hashPassword(p.data.password) } });
  await audit(r.userId, "user.password_reset");
  return { done: true };
}
