import { db } from "@/lib/db";
import { Decimal } from "@/lib/money";

export default async function Ledger() {
  const [accounts, sums] = await Promise.all([
    db.ledgerAccount.findMany({ orderBy: { code: "asc" } }),
    db.posting.groupBy({ by: ["accountId"], _sum: { amount: true } }),
  ]);
  const bal = (id: string) => new Decimal(sums.find((s) => s.accountId === id)?._sum.amount?.toString() ?? 0);
  const totals = new Map<string, Decimal>();
  for (const a of accounts) totals.set(a.currency, (totals.get(a.currency) ?? new Decimal(0)).plus(bal(a.id)));
  return (
    <div className="space-y-4">
      <h1 className="h1">Ledger</h1>
      <p className="text-sm text-muted">
        Positive = debit (money we hold or paid out), negative = credit (income or what we owe). Each currency must total zero.
      </p>
      <div className="flex flex-wrap gap-2">
        {[...totals].map(([cur, t]) => (
          <span key={cur} className={`rounded-full px-3 py-1 text-sm font-semibold ${t.isZero() ? "bg-brand-soft text-brand-dark" : "bg-red-50 text-danger"}`}>
            {cur} total {t.toString()} {t.isZero() ? "✓ balanced" : "✗ NOT BALANCED"}
          </span>
        ))}
      </div>
      <div className="divide-y divide-line rounded-2xl border border-line bg-white">
        {accounts.length === 0 && <p className="p-5 text-muted">No entries yet. Entries appear when payments are confirmed.</p>}
        {accounts.map((a) => (
          <div key={a.id} className="num flex justify-between px-5 py-3 text-sm">
            <span>{a.code}</span>
            <span className="font-semibold">{bal(a.id).toFixed(2)} {a.currency}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
