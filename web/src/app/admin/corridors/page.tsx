import { db } from "@/lib/db";
import { updateCorridor } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { priceTransfer } from "@/lib/money";
import { settingsOf } from "@/lib/services/pricing";
import { fmtDate } from "@/lib/format";

export default async function Corridors() {
  const list = await db.corridor.findMany({ orderBy: { fromCurrency: "asc" } });
  return (
    <div className="space-y-4">
      <h1 className="h1">Rates & fees</h1>
      <p className="text-sm text-muted">
        Market rate = 1 unit of the sending currency in the receiving currency. Margin and percent fee are in basis points (100 = 1%).
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((c) => {
          const ex = priceTransfer(settingsOf(c), { send: c.fromCurrency === "RUB" ? "10000" : "100000" });
          return (
            <div key={c.id} className="card">
              <h2 className="text-lg font-bold">{c.fromCurrency} → {c.toCurrency}</h2>
              <p className="mb-3 text-xs text-muted">Rate updated {fmtDate(c.rateUpdatedAt, "en")} MSK</p>
              <ActionForm action={updateCorridor} submit="Save">
                <input type="hidden" name="id" value={c.id} />
                <div className="grid grid-cols-2 gap-3">
                  <F name="midRate" label="Market rate" v={c.midRate.toString()} />
                  <F name="marginBps" label="Margin (bps)" v={String(c.marginBps)} />
                  <F name="fixedFee" label={`Fixed fee (${c.fromCurrency})`} v={c.fixedFee.toString()} />
                  <F name="percentFeeBps" label="Percent fee (bps)" v={String(c.percentFeeBps)} />
                  <F name="minSend" label="Min send" v={c.minSend.toString()} />
                  <F name="maxSend" label="Max send" v={c.maxSend.toString()} />
                </div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={c.enabled} /> Enabled</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirmBig" /> Confirm big change (over 10%)</label>
              </ActionForm>
              <p className="num mt-3 rounded-xl bg-paper p-3 text-xs">
                Example: {ex.sendAmount.toString()} {c.fromCurrency} → customer pays {ex.totalToPay.toString()}, recipient gets {ex.receiveAmount.toString()} {c.toCurrency}. Our income: fee {ex.fee.toString()} + margin {ex.marginCost.toString()} = {ex.totalCost.toString()} {c.fromCurrency}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function F({ name, label, v }: { name: string; label: string; v: string }) {
  return (
    <div>
      <label className="label text-xs" htmlFor={name}>{label}</label>
      <input id={name} name={name} defaultValue={v} inputMode="decimal" className="input num py-2" required />
    </div>
  );
}
