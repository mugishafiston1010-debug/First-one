import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { readSession, signSession, SESSION_COOKIE, SESSION_HOURS } from "./session";

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

/** Hash of a random string: comparing against it keeps login timing the same for unknown emails. */
let dummyHash: Promise<string> | null = null;
export async function checkLogin(email: string, password: string) {
  const admin = await db.adminUser.findUnique({ where: { email: email.toLowerCase().trim() } });
  dummyHash ??= hashPassword(crypto.randomUUID());
  const ok = await verifyPassword(password, admin?.passwordHash ?? (await dummyHash));
  if (!admin || !ok || !admin.active) return null;
  return admin;
}

export async function startSession(admin: { id: string; role: "OWNER" | "EDITOR" }) {
  const token = await signSession({ aid: admin.id, role: admin.role });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The signed-in admin, read fresh from the database so deactivation and role changes apply at once. */
export async function currentAdmin() {
  const s = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return null;
  const a = await db.adminUser.findUnique({ where: { id: s.aid } });
  return a && a.active ? a : null;
}

export async function requireAdmin() {
  const a = await currentAdmin();
  if (!a) redirect("/admin/login");
  return a;
}

export async function requireOwner() {
  const a = await requireAdmin();
  if (a.role !== "OWNER") redirect("/admin");
  return a;
}
