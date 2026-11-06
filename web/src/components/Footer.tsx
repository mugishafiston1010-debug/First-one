import Link from "next/link";
import { BRAND, TELEGRAM, whatsappLink } from "@/lib/brand";
import { getT } from "@/lib/i18n";

export async function Footer() {
  const { t } = await getT();
  return (
    <footer className="mt-16 border-t border-line bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-semibold text-ink">{BRAND}</div>
          <div>{t("footer.tagline")}</div>
        </div>
        <div className="flex flex-wrap gap-4">
          <a href={whatsappLink()} target="_blank" rel="noreferrer">WhatsApp</a>
          {TELEGRAM && <a href={`https://t.me/${TELEGRAM}`} target="_blank" rel="noreferrer">Telegram</a>}
          <Link href="/terms">{t("footer.terms")}</Link>
          <Link href="/privacy">{t("footer.privacy")}</Link>
        </div>
      </div>
    </footer>
  );
}
