import Link from "next/link";
import type { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { expireStaleOrders } from "@/lib/services/orders";
import { OrderRow } from "@/components/OrderRow";
import { en } from "@/lib/i18n/en";
import { AiBadge } from "@/components/AiBadge";

const TABS: OrderStatus[] = ["PAYMENT_SUBMITTED", "PAYMENT_CONFIRMED", "AWAITING_PAYMENT", "DELIVERED", "EXPIRED", "CANCELLED", "REFUNDED"];

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  await expireStaleOrders();
  const status = (TABS.includes(sp.status as OrderStatus) ? sp.status : "PAYMENT_SUBMITTED") as OrderStatus;
  const q = sp.q?.trim();
  const [counts, orders] = await Promise.all([
    db.order.groupBy({ by: ["status"], _count: true }),
    db.order.findMany({
      where: q
        ? { OR: [{ ref: { contains: q, mode: "insensitive" } }, { recipientName: { contains: q, mode: "insensitive" } }, { user: { email: { contains: q, mode: "insensitive" } } }] }
        : { status },
      orderBy: { createdAt: status === "PAYMENT_SUBMITTED" || status === "PAYMENT_CONFIRMED" ? "asc" : "desc" },
      take: 100,
      include: { user: { select: { fullName: true } } },
    }),
  ]);
  const count = (s: OrderStatus) => counts.find((c) => c.status === s)?._count ?? 0;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h1">Orders</h1>
        <form className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Order ref, name or email" className="input py-2" />
          <button className="btn-ghost py-2">Find</button>
        </form>
      </div>
      <div className="-mx-4 flex gap-1 overflow-x-auto px-4 text-sm">
        {TABS.map((s) => (
          <Link key={s} href={`/admin?status=${s}`} className={`whitespace-nowrap rounded-full px-3 py-1.5 font-medium ${!q && s === status ? "bg-ink text-white" : "border border-line bg-white"}`}>
            {en[`order.status.${s}`]} <span className="num opacity-70">{count(s)}</span>
          </Link>
        ))}
      </div>
      <p className="text-sm text-muted">
        {status === "PAYMENT_SUBMITTED" && !q && "Check each receipt against the money on the pay-in account, oldest first."}
        {status === "PAYMENT_CONFIRMED" && !q && "Pay these recipients, then mark delivered with proof."}
      </p>
      <div className="divide-y divide-line rounded-2xl border border-line bg-white">
        {orders.length === 0 && <p className="p-5 text-muted">Nothing here.</p>}
        {orders.map((o) => (
          <OrderRow key={o.id} o={o} href={`/admin/orders/${o.ref}`} statusLabel={en[`order.status.${o.status}`]} locale="en" extra={<> · {o.user.fullName}<AiBadge verdict={o.aiVerdict} /></>} />
        ))}
      </div>
    </div>
  );
}
