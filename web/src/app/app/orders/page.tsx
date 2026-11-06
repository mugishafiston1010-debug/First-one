import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getT, type TKey } from "@/lib/i18n";
import { expireStaleOrders } from "@/lib/services/orders";
import { OrderRow } from "@/components/OrderRow";

export default async function OrdersPage() {
  const user = await requireUser();
  const { t, locale } = await getT();
  await expireStaleOrders({ userId: user.id });
  const orders = await db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div className="space-y-4">
      <h1 className="h1">{t("nav.orders")}</h1>
      <div className="divide-y divide-line rounded-2xl border border-line bg-white">
        {orders.length === 0 && <p className="p-5 text-muted">{t("dash.none")}</p>}
        {orders.map((o) => (
          <OrderRow key={o.id} o={o} href={`/app/orders/${o.ref}`} statusLabel={t(`order.status.${o.status}` as TKey)} locale={locale} />
        ))}
      </div>
    </div>
  );
}
