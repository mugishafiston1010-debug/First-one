import { NextResponse, type NextRequest } from "next/server";
import { readSession, SESSION_COOKIE } from "@/lib/session";

/**
 * First gate: no valid session, no access to /app or /admin.
 * The role is NOT checked here (the cookie can be older than a role change):
 * admin pages check the role in the database on every request.
 */
export async function middleware(req: NextRequest) {
  const s = await readSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.redirect(new URL("/signin", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*", "/admin/:path*"] };
