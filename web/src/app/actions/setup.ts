"use server";
import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, startSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

export type SetupState = { error?: string } | undefined;

/** Starting routes. Rates must be updated by the admin right after setup. */
const DEFAULT_CORRIDORS = [
  { fromCurrency: "RUB", toCurrency: "RWF", midRate: "16.32", marginBps: 150, fixedFee: "100", percentFeeBps: 50, minSend: "500", maxSend: "300000" },
  { fromCurrency: "RWF", toCurrency: "RUB", midRate: "0.06127", marginBps: 150, fixedFee: "0", percentFeeBps: 100, minSend: "5000", maxSend: "5000000" },
];

const schema = z.object({
  token: z.string().min(1),
  fullName: z.string().trim().min(3).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(12, "Admin password must be at least 12 characters"),
});

/** First start online: create the admin account and default routes. Works only while no admin exists. */
export async function runSetup(_: SetupState, form: FormData): Promise<SetupState> {
  if (await db.user.findFirst({ where: { role: "ADMIN" } })) return { error: "Setup is already done." };
  const p = schema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const want = process.env.SETUP_TOKEN ?? "";
  const got = p.data.token;
  if (!want || want.length !== got.length || !timingSafeEqual(Buffer.from(want), Buffer.from(got))) return { error: "Wrong setup code." };
  if (await db.user.findUnique({ where: { email: p.data.email } })) return { error: "This email already has an account." };

  const admin = await db.user.create({
    data: { email: p.data.email, fullName: p.data.fullName, role: "ADMIN", kycStatus: "APPROVED", passwordHash: await hashPassword(p.data.password) },
  });
  if ((await db.corridor.count()) === 0) await db.corridor.createMany({ data: DEFAULT_CORRIDORS });
  await audit(admin.id, "setup.done");
  await startSession(admin);
  redirect("/admin/settings");
}
