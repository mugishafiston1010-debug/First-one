import Link from "next/link";
import { Calculator } from "@/components/Calculator";
import { enabledCorridors, settingsOf } from "@/lib/services/pricing";
import { getT, type TKey } from "@/lib/i18n";
import { calcLabels } from "@/lib/calc-labels";
import { currentUser } from "@/lib/auth";
import { CURRENCIES, priceTransfer } from "@/lib/money";
import { whatsappLink } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [{ t, locale }, corridors, user] = await Promise.all([getT(), enabledCorridors(), currentUser()]);
  const settings = corridors.map(settingsOf);
  const sendHref = user ? "/app/send" : "/signup";

  return (
    <div className="space-y-16">
      <section className="grid items-start gap-8 md:grid-cols-[1.1fr_1fr]">
        <div className="pt-2">
          <h1 className="h1 leading-tight">{t("home.title")}</h1>
          <p className="mt-4 text-lg text-muted">{t("home.subtitle")}</p>
          <div className="mt-6 flex flex-wrap gap-2 text-sm">
            {["MTN MoMo", "Airtel Money", "Sber", "SBP", "Bank of Kigali", "Equity"].map((x) => (
              <span key={x} className="rounded-full border border-line bg-white px-3 py-1 font-medium">{x}</span>
            ))}
          </div>
        </div>
        <div className="card shadow-sm">
          {settings.length ? (
            <Calculator
              corridors={settings}
              labels={calcLabels(t)}
              locale={locale}
              continueTo={sendHref}
            />
          ) : (
            <p className="text-muted">{t("calc.unavailable")}</p>
          )}
        </div>
      </section>

      {settings.length > 0 && (
        <section>
          <h2 className="h2">{t("home.ratesTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("home.ratesNote")}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {corridors.map((c) => {
              const p = priceTransfer(settingsOf(c), { send: c.minSend.toString() });
              return (
                <div key={c.id} className="card flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted">
                      {CURRENCIES[c.fromCurrency]?.flag} {c.fromCurrency} → {CURRENCIES[c.toCurrency]?.flag} {c.toCurrency}
                    </div>
                    <div className="num mt-1 text-2xl font-bold">{p.customerRate.toDecimalPlaces(4).toString()}</div>
                  </div>
                  <div className="text-right text-xs text-muted">
                    {t("calc.marketRate")}
                    <div className="num text-sm">{p.midRate.toDecimalPlaces(4).toString()}</div>
                    <div className="mt-1">{c.rateUpdatedAt.toLocaleString(locale === "ru" ? "ru-RU" : "en-GB", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Moscow" })} MSK</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="h2">{t("home.howTitle")}</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {([1, 2, 3, 4] as const).map((i) => (
            <li key={i} className="card">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft font-bold text-brand">{i}</div>
              <h3 className="mt-3 font-semibold">{t(`home.how${i}.t` as TKey)}</h3>
              <p className="mt-1 text-sm text-muted">{t(`home.how${i}.d` as TKey)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="h2">{t("home.trustTitle")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {([1, 2, 3] as const).map((i) => (
            <div key={i} className="card">
              <h3 className="font-semibold">{t(`home.trust${i}.t` as TKey)}</h3>
              <p className="mt-1 text-sm text-muted">{t(`home.trust${i}.d` as TKey)}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="h2">{t("home.faqTitle")}</h2>
        <div className="mt-4 divide-y divide-line rounded-2xl border border-line bg-white">
          {([1, 2, 3, 4] as const).map((i) => (
            <details key={i} className="group px-5 py-4">
              <summary className="cursor-pointer list-none font-semibold">
                {t(`home.faq${i}.q` as TKey)} <span className="float-right text-muted group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-sm text-muted">{t(`home.faq${i}.a` as TKey)}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="card flex flex-col items-start gap-4 bg-brand text-white sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold">{t("home.ctaTitle")}</h2>
        <div className="flex gap-2">
          <Link href={sendHref} className="btn bg-white text-brand hover:bg-brand-soft">{t("nav.send")}</Link>
          <a href={whatsappLink()} target="_blank" rel="noreferrer" className="btn border border-white/40 text-white hover:bg-white/10">WhatsApp</a>
        </div>
      </section>
    </div>
  );
}
