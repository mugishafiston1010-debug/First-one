import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getT, type TKey } from "@/lib/i18n";
import { expireStaleOrders, sentLast30Days } from "@/lib/services/orders";
import { remainingLimit } from "@/lib/limits";
import { formatMoney } from "@/lib/money";
import { OrderRow } from "@/components/OrderRow";

export default async function Dashboard() {
  const user = await requireUser();
  const { t, locale } = await getT();
  await expireStaleOrders({ userId: user.id });
  const [orders, sentRub] = await Promise.all([
    db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    sentLast30Days(user.id, "RUB"),
  ]);
  const left = remainingLimit("RUB", user.kycStatus, sentRub);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted">{t("dash.hello")},</p>
          <h1 className="h1">{user.fullName.split(" ")[0]}</h1>
        </div>
        <Link href="/app/send" className="btn-primary">{t("dash.newTransfer")} →</Link>
      </div>

      {user.kycStatus === "PENDING" && <div className="notice">{t("dash.kycPending")}</div>}
      {(user.kycStatus === "NONE" || user.kycStatus === "REJECTED") && (
        <Link href="/app/kyc" className="card flex items-center justify-between gap-4 border-sky/30 bg-sky-50 hover:bg-sky-100">
          <div>
            <div className="font-semibold">{t(user.kycStatus === "REJECTED" ? "dash.kycRejected" : "dash.verifyCta")}</div>
            <div className="text-sm text-muted">
              {t("dash.limit")} <span className="num font-semibold text-ink">{formatMoney(left, "RUB", locale)}</span> {t("dash.limitPeriod")}
            </div>
          </div>
          <span className="text-xl">→</span>
        </Link>
      )}

      <section className="rounded-2xl border border-line bg-white">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="font-bold">{t("dash.recent")}</h2>
          <Link href="/app/orders" className="text-sm font-semibold text-brand">{t("dash.allTransfers")} →</Link>
        </div>
        {orders.length === 0 ? (
          <p className="px-5 pb-6 text-muted">{t("dash.none")}</p>
        ) : (
          <div className="divide-y divide-line">
            {orders.map((o) => (
              <OrderRow key={o.id} o={o} href={`/app/orders/${o.ref}`} statusLabel={t(`order.status.${o.status}` as TKey)} locale={locale} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
