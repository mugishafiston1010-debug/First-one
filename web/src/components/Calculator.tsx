"use client";
import { useMemo, useState } from "react";
import { CURRENCIES, formatMoney, priceTransfer, PriceError, type PriceSettings } from "@/lib/money";

export type CalcLabels = {
  youSend: string;
  theyGet: string;
  fee: string;
  margin: string;
  totalCost: string;
  youPay: string;
  ourRate: string;
  marketRate: string;
  min: string;
  max: string;
  invalid: string;
  continue: string;
};

export type CalcValue = { from: string; to: string; send?: string; receive?: string };

export function Calculator({
  corridors,
  labels,
  locale,
  initial,
  onContinue,
  continueTo,
  busy,
}: {
  corridors: PriceSettings[];
  labels: CalcLabels;
  locale: string;
  initial?: Partial<CalcValue>;
  onContinue?: (v: CalcValue) => void;
  /** Link to go to on continue; the amount is added as query parameters. */
  continueTo?: string;
  busy?: boolean;
}) {
  const first = corridors.find((c) => c.fromCurrency === initial?.from && c.toCurrency === initial?.to) ?? corridors[0];
  const [pair, setPair] = useState(`${first?.fromCurrency}-${first?.toCurrency}`);
  const [sendStr, setSendStr] = useState(initial?.send ?? (first?.fromCurrency === "RUB" ? "10000" : "100000"));
  const [recvStr, setRecvStr] = useState(initial?.receive ?? "");
  const [edited, setEdited] = useState<"send" | "receive">(initial?.receive ? "receive" : "send");

  const c = corridors.find((x) => `${x.fromCurrency}-${x.toCurrency}` === pair);

  const result = useMemo(() => {
    if (!c) return { error: labels.invalid };
    const raw = (edited === "send" ? sendStr : recvStr).replace(/[\s,]/g, "").replace(",", ".");
    if (!raw) return { error: labels.invalid };
    try {
      return { price: priceTransfer(c, edited === "send" ? { send: raw } : { receive: raw }) };
    } catch (e) {
      if (e instanceof PriceError && e.code === "BELOW_MIN") return { error: `${labels.min} ${formatMoney(e.limit!, c.fromCurrency, locale)}` };
      if (e instanceof PriceError && e.code === "ABOVE_MAX") return { error: `${labels.max} ${formatMoney(e.limit!, c.fromCurrency, locale)}` };
      return { error: labels.invalid };
    }
  }, [c, edited, sendStr, recvStr, labels, locale]);

  if (!c) return null;
  const p = "price" in result ? result.price : undefined;
  const value: CalcValue = edited === "send" ? { from: c.fromCurrency, to: c.toCurrency, send: p?.sendAmount.toString() ?? sendStr } : { from: c.fromCurrency, to: c.toCurrency, receive: recvStr };

  const shownSend = edited === "send" ? sendStr : p ? p.sendAmount.toString() : "";
  const shownRecv = edited === "receive" ? recvStr : p ? p.receiveAmount.toString() : "";
  const swapTo = corridors.find((x) => x.fromCurrency === c.toCurrency && x.toCurrency === c.fromCurrency);

  const amountBox = (label: string, cur: string, val: string, onChange: (v: string) => void, curSelect?: React.ReactNode) => (
    <div className="rounded-xl border border-line bg-paper px-4 py-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="flex items-center gap-2">
        <input
          inputMode="decimal"
          className="num w-full min-w-0 bg-transparent py-1 text-2xl font-semibold outline-none"
          value={val}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,\s]/g, ""))}
          aria-label={label}
        />
        {curSelect ?? (
          <span className="shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-sm font-semibold">
            {CURRENCIES[cur]?.flag} {cur}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {amountBox(
        labels.youSend,
        c.fromCurrency,
        shownSend,
        (v) => {
          setEdited("send");
          setSendStr(v);
        },
        <select
          className="shrink-0 rounded-lg bg-white px-2 py-1.5 text-sm font-semibold"
          value={pair}
          onChange={(e) => setPair(e.target.value)}
          aria-label="Route"
        >
          {corridors.map((x) => (
            <option key={`${x.fromCurrency}-${x.toCurrency}`} value={`${x.fromCurrency}-${x.toCurrency}`}>
              {CURRENCIES[x.fromCurrency]?.flag} {x.fromCurrency} → {x.toCurrency}
            </option>
          ))}
        </select>,
      )}
      {swapTo && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => {
              setPair(`${swapTo.fromCurrency}-${swapTo.toCurrency}`);
              setEdited("send");
              setSendStr(swapTo.fromCurrency === "RUB" ? "10000" : "100000");
            }}
            className="rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-muted hover:text-ink"
          >
            ⇅ {swapTo.fromCurrency} → {swapTo.toCurrency}
          </button>
        </div>
      )}
      {amountBox(labels.theyGet, c.toCurrency, shownRecv, (v) => {
        setEdited("receive");
        setRecvStr(v);
      })}

      {p ? (
        <dl className="space-y-1.5 rounded-xl px-1 text-sm">
          <Row k={labels.fee} v={formatMoney(p.fee, c.fromCurrency, locale)} />
          <Row k={labels.margin} v={formatMoney(p.marginCost, c.fromCurrency, locale)} />
          <Row k={labels.totalCost} v={formatMoney(p.totalCost, c.fromCurrency, locale)} strong />
          <div className="my-2 border-t border-line" />
          <Row k={labels.ourRate} v={`1 ${c.fromCurrency} = ${p.customerRate.toDecimalPlaces(4).toString()} ${c.toCurrency}`} />
          <Row k={labels.marketRate} v={`1 ${c.fromCurrency} = ${p.midRate.toDecimalPlaces(4).toString()} ${c.toCurrency}`} muted />
          <div className="my-2 border-t border-line" />
          <Row k={labels.youPay} v={formatMoney(p.totalToPay, c.fromCurrency, locale)} big />
        </dl>
      ) : (
        <p className="px-1 text-sm text-warn" role="status">{"error" in result ? result.error : ""}</p>
      )}

      {continueTo ? (
        <a href={p ? `${continueTo}?${new URLSearchParams(Object.entries(value).filter(([, x]) => x) as [string, string][]).toString()}` : undefined} aria-disabled={!p} className={`btn-primary w-full ${p ? "" : "pointer-events-none opacity-50"}`}>
          {labels.continue}
        </a>
      ) : (
        <button type="button" disabled={!p || busy} onClick={() => onContinue?.(value)} className="btn-primary w-full">
          {busy ? "…" : labels.continue}
        </button>
      )}
    </div>
  );
}

function Row({ k, v, strong, muted, big }: { k: string; v: string; strong?: boolean; muted?: boolean; big?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${muted ? "text-muted" : ""}`}>
      <dt className={big ? "font-semibold" : "text-muted"}>{k}</dt>
      <dd className={`num text-right ${strong || big ? "font-semibold" : ""} ${big ? "text-lg" : ""}`}>{v}</dd>
    </div>
  );
}
