import { NextResponse, type NextRequest } from "next/server";
import { readSession, SESSION_COOKIE } from "@/lib/session";

/** First gate: no valid session, no access to /app or /admin. Pages re-check role and suspension from the database. */
export async function middleware(req: NextRequest) {
  const s = await readSession(req.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = req.nextUrl;
  if (!s) return NextResponse.redirect(new URL("/signin", req.url));
  if (pathname.startsWith("/admin") && s.role !== "ADMIN") return NextResponse.redirect(new URL("/app", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*", "/admin/:path*"] };
