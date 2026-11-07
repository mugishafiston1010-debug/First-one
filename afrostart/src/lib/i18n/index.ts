import "server-only";
import { cookies } from "next/headers";
import en, { type Dict } from "./en";
import ru from "./ru";
import { DEFAULT_LOCALE, isReadyLocale, LOCALE_COOKIE, type Locale } from "./config";

const dictionaries: Partial<Record<Locale, Partial<{ [K in keyof Dict]: Partial<Dict[K]> }>>> = { ru };

export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isReadyLocale(v) ? v : DEFAULT_LOCALE;
}

/** Dictionary for the locale, with every missing string filled from English. */
export function dictFor(locale: Locale): Dict {
  const d = dictionaries[locale];
  if (!d) return en;
  const out = {} as Record<string, unknown>;
  for (const k of Object.keys(en) as (keyof Dict)[]) out[k] = { ...en[k], ...(d[k] ?? {}) };
  return out as Dict;
}

export async function getDict() {
  const locale = await getLocale();
  return { locale, t: dictFor(locale) };
}
