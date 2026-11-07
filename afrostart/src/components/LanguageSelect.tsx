"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Globe } from "lucide-react";
import { LOCALES } from "@/lib/i18n/config";
import { setLanguage } from "@/app/actions/lang";

export function LanguageSelect({ locale, label, soon, dark = false }: { locale: string; label: string; soon: string; dark?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label className={`relative inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm ${dark ? "text-white/80" : "text-muted"} ${pending ? "opacity-60" : ""}`}>
      <Globe className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <select
        value={locale}
        aria-label={label}
        disabled={pending}
        onChange={(e) => start(async () => { await setLanguage(e.target.value); router.refresh(); })}
        className={`cursor-pointer appearance-none bg-transparent pr-1 font-medium outline-none ${dark ? "text-white" : "text-ink"}`}
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code} disabled={!l.ready} className="text-ink">
            {l.native}{l.ready ? "" : ` (${soon})`}
          </option>
        ))}
      </select>
    </label>
  );
}
