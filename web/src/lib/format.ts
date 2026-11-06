export function fmtDate(d: Date, locale: string) {
  return d.toLocaleString(locale === "ru" ? "ru-RU" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Moscow" });
}
export function fmtTime(d: Date, locale: string) {
  return d.toLocaleTimeString(locale === "ru" ? "ru-RU" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" });
}
