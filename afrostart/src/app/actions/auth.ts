"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { checkLogin, endSession, startSession } from "@/lib/auth";
import { clientIp, hashIp, tooMany } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

export type LoginState = { error?: string; email?: string };

export async function login(_: LoginState, fd: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  const email = String(fd.get("email") ?? "").slice(0, 160);
  if (!parsed.success) return { error: "Enter your email and password.", email };
  const ip = hashIp(await clientIp());
  if (tooMany(`login:${ip}`, 10, 15 * 60 * 1000) || tooMany(`login:${parsed.data.email}`, 5, 15 * 60 * 1000))
    return { error: "Too many attempts. Wait 15 minutes and try again.", email };
  const admin = await checkLogin(parsed.data.email, parsed.data.password);
  if (!admin) return { error: "Wrong email or password.", email };
  await db.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  await audit(admin.id, "login", "AdminUser", admin.id);
  await startSession(admin);
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}
