import { startOfDay } from "date-fns";
import { db } from "@/lib/db";
import { createPayIn, togglePayIn } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { formatMoney } from "@/lib/money";

export default async function PayIn() {
  const [list, used] = await Promise.all([
    db.payInAccount.findMany({ orderBy: [{ currency: "asc" }, { createdAt: "asc" }] }),
    db.order.groupBy({
      by: ["payInAccountId"],
      _sum: { totalToPay: true },
      where: { createdAt: { gte: startOfDay(new Date()) }, status: { in: ["AWAITING_PAYMENT", "PAYMENT_SUBMITTED", "PAYMENT_CONFIRMED", "DELIVERED"] } },
    }),
  ]);
  const usedOf = (id: string) => used.find((u) => u.payInAccountId === id)?._sum.totalToPay?.toString() ?? "0";
  return (
    <div className="space-y-4">
      <h1 className="h1">Pay-in accounts</h1>
      <p className="text-sm text-muted">
        Customers are sent to the active account with the lowest share of its daily limit used. Keep limits low enough that banks do not flag the cards.
      </p>
      <div className="divide-y divide-line rounded-2xl border border-line bg-white">
        {list.map((a) => {
          const u = usedOf(a.id);
          const pct = Math.min(100, (Number(u) / Number(a.dailyLimit)) * 100);
          return (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <div className="font-semibold">{a.label} {!a.active && <span className="text-danger">(off)</span>}</div>
                <div className="text-sm text-muted">{a.provider} · <span className="num">{a.accountNumber}</span> · {a.holderName}</div>
                <div className="num text-xs text-muted">
                  today {formatMoney(u, a.currency)} / {formatMoney(a.dailyLimit, a.currency)} · max per order {formatMoney(a.perOrderLimit, a.currency)}
                </div>
                <div className="mt-1 h-1.5 w-48 rounded-full bg-line"><div className="h-1.5 rounded-full bg-brand" style={{ width: `${pct}%` }} /></div>
              </div>
              <form action={togglePayIn}>
                <input type="hidden" name="id" value={a.id} />
                <button className={a.active ? "btn-danger py-2" : "btn-ghost py-2"}>{a.active ? "Turn off" : "Turn on"}</button>
              </form>
            </div>
          );
        })}
      </div>
      <div className="card max-w-xl">
        <h2 className="mb-3 font-bold">Add account</h2>
        <ActionForm action={createPayIn} submit="Add">
          <input name="label" className="input" placeholder="Label, e.g. Agent Eric Sber" required />
          <div className="grid grid-cols-2 gap-3">
            <select name="currency" className="input"><option>RUB</option><option>RWF</option></select>
            <select name="method" className="input">
              <option value="CARD">Card</option><option value="SBP_PHONE">SBP phone</option>
              <option value="MOBILE_MONEY">Mobile money</option><option value="BANK_ACCOUNT">Bank account</option>
            </select>
          </div>
          <input name="provider" className="input" placeholder="Bank / provider, e.g. Sberbank, MTN MoMo" required />
          <input name="holderName" className="input" placeholder="Holder name as the bank shows it" required />
          <input name="accountNumber" className="input num" placeholder="Card / phone / account number" required />
          <div className="grid grid-cols-2 gap-3">
            <input name="dailyLimit" className="input num" placeholder="Daily limit" inputMode="decimal" required />
            <input name="perOrderLimit" className="input num" placeholder="Max per order" inputMode="decimal" required />
          </div>
        </ActionForm>
      </div>
    </div>
  );
}
