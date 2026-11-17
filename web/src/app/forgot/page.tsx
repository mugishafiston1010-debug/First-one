import Link from "next/link";
import { getT } from "@/lib/i18n";
import { getSettings, telegramUrl, whatsappUrl } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Forgot password" };

export default async function Forgot() {
  const [{ t }, s] = await Promise.all([getT(), getSettings()]);
  const wa = whatsappUrl(s, `${t("forgot.message")} `);
  const tg = telegramUrl(s);
  return (
    <div className="mx-auto max-w-md card space-y-4">
      <h1 className="h2">{t("forgot.title")}</h1>
      <p className="text-muted">{t("forgot.text")}</p>
      {wa || tg ? (
        <div className="flex gap-2">
          {wa && <a href={wa} target="_blank" rel="noreferrer" className="btn-primary flex-1">WhatsApp</a>}
          {tg && <a href={tg} target="_blank" rel="noreferrer" className="btn-ghost flex-1">Telegram</a>}
        </div>
      ) : (
        <p className="notice">{t("forgot.noSupport")}</p>
      )}
      <Link href="/signin" className="block text-sm font-semibold text-brand">← {t("nav.signin")}</Link>
    </div>
  );
}
