"use server";
import { cookies } from "next/headers";
import { isReadyLocale, LOCALE_COOKIE } from "@/lib/i18n/config";

export async function setLanguage(code: string) {
  if (!isReadyLocale(code)) return;
  (await cookies()).set(LOCALE_COOKIE, code, { path: "/", maxAge: 365 * 24 * 3600, sameSite: "lax" });
}
