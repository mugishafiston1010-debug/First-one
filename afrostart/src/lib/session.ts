import { SignJWT, jwtVerify } from "jose";

/** Edge-safe session helpers (used by middleware and the server). */
export const SESSION_COOKIE = "afs_admin";
export const SESSION_HOURS = 12;

export type SessionPayload = { aid: string; role: "OWNER" | "EDITOR" };

function key() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return new TextEncoder().encode(s);
}

export async function signSession(p: SessionPayload): Promise<string> {
  return new SignJWT(p)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(key());
}

export async function readSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (typeof payload.aid !== "string") return null;
    return { aid: payload.aid, role: payload.role === "OWNER" ? "OWNER" : "EDITOR" };
  } catch {
    return null;
  }
}
