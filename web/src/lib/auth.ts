import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { readSession, signSession, SESSION_COOKIE, SESSION_DAYS } from "./session";

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function startSession(user: { id: string; role: "CUSTOMER" | "ADMIN" }) {
  const token = await signSession({ uid: user.id, role: user.role });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The signed-in user, read fresh from the database (role and suspension always current). */
export async function currentUser() {
  const s = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return null;
  return db.user.findUnique({ where: { id: s.uid } });
}

export async function requireUser() {
  const u = await currentUser();
  if (!u) redirect("/signin");
  if (u.suspended) redirect("/suspended");
  return u;
}

export async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== "ADMIN") redirect("/app");
  return u;
}
