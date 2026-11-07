import { CalendarCheck, CircleAlert } from "lucide-react";

export function fmtDate(d: Date | null | undefined, locale = "en") {
  if (!d) return "";
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(d);
}

/** "Last verified" line. Missing date is shown honestly, never hidden. */
export function VerifiedOn({ date, locale = "en", labels }: { date: Date | null; locale?: string; labels?: { lastVerified: string; notVerified: string } }) {
  const l = labels ?? { lastVerified: "Last verified", notVerified: "Not yet verified" };
  return date ? (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <CalendarCheck className="h-3.5 w-3.5 text-leaf-600" aria-hidden="true" />
      {l.lastVerified}: <time dateTime={date.toISOString()}>{fmtDate(date, locale)}</time>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs text-sun-700">
      <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
      {l.notVerified}
    </span>
  );
}
