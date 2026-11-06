"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { endSession, hashPassword, startSession, verifyPassword } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { tooMany } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

/** Only allow redirects to our own customer pages, never to another site. */
function safeNext(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v : "";
  return /^\/app(\/[\w\-/?=&.%]*)?$/.test(s) && !s.startsWith("//") ? s : null;
}

export type FormState = { error?: string } | undefined;

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || "local";
}

const signUpSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().regex(/^\+?[\d\s()-]{8,20}$/),
  password: z.string().min(8).max(200),
});

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const { t } = await getT();
  if (tooMany(`signup:${await clientIp()}`, 10, 60 * 60_000)) return { error: t("auth.tooMany") };
  const parsed = signUpSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: t("common.error") + " (" + parsed.error.issues.map((i) => i.path.join(".")).join(", ") + ")" };
  const { fullName, email, phone, password } = parsed.data;
  if (await db.user.findUnique({ where: { email } })) return { error: t("auth.emailTaken") };
  const user = await db.user.create({
    data: { fullName, email, phone: phone.replace(/[\s()-]/g, ""), passwordHash: await hashPassword(password) },
  });
  await audit(user.id, "user.signup");
  await startSession(user);
  redirect(safeNext(form.get("next")) ?? "/app");
}

const signInSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) });

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const { t } = await getT();
  const parsed = signInSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: t("auth.badLogin") };
  const { email, password } = parsed.data;
  if (tooMany(`signin:${email}`, 8, 15 * 60_000) || tooMany(`signin-ip:${await clientIp()}`, 30, 15 * 60_000))
    return { error: t("auth.tooMany") };
  const user = await db.user.findUnique({ where: { email } });
  // Same message and similar timing whether or not the email exists.
  const ok = user ? await verifyPassword(password, user.passwordHash) : await verifyPassword(password, "$2a$12$" + "x".repeat(53));
  if (!user || !ok) return { error: t("auth.badLogin") };
  await audit(user.id, "user.signin");
  await startSession(user);
  redirect(safeNext(form.get("next")) ?? (user.role === "ADMIN" ? "/admin" : "/app"));
}

export async function signOut() {
  await endSession();
  redirect("/");
}
