import "server-only";
import { cookies, headers } from "next/headers";
import { en, type Dict } from "./en";
import { ru } from "./ru";

export const LOCALES = { en, ru } as const;
export type Locale = keyof typeof LOCALES;
export type TKey = keyof Dict;

export async function getLocale(): Promise<Locale> {
  const c = (await cookies()).get("lang")?.value;
  if (c === "en" || c === "ru") return c;
  const al = (await headers()).get("accept-language") ?? "";
  return al.toLowerCase().startsWith("ru") ? "ru" : "en";
}

export async function getT() {
  const locale = await getLocale();
  const dict = LOCALES[locale];
  const t = (k: TKey) => dict[k] ?? en[k];
  return { t, locale, dict };
}
