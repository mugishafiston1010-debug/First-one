import { SignJWT, jwtVerify } from "jose";

/** Edge-safe session helpers (used by middleware and the server). */
export const SESSION_COOKIE = "session";
export const SESSION_DAYS = 14;

export type SessionPayload = { uid: string; role: "CUSTOMER" | "ADMIN" };

function key() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return new TextEncoder().encode(s);
}

export async function signSession(p: SessionPayload): Promise<string> {
  return new SignJWT(p)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(key());
}

export async function readSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    if (typeof payload.uid !== "string") return null;
    return { uid: payload.uid, role: payload.role === "ADMIN" ? "ADMIN" : "CUSTOMER" };
  } catch {
    return null;
  }
}
