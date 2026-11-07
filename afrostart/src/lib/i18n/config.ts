/** Languages. `ready: false` = prepared but not yet switched on (needs a reviewed translation first). */
export const LOCALES = [
  { code: "en", label: "English", native: "English", ready: true },
  { code: "ru", label: "Russian", native: "Русский", ready: true },
  { code: "rw", label: "Kinyarwanda", native: "Ikinyarwanda", ready: false },
  { code: "fr", label: "French", native: "Français", ready: false },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "afs_lang";

export function isReadyLocale(v: string | undefined): v is Locale {
  return LOCALES.some((l) => l.code === v && l.ready);
}
