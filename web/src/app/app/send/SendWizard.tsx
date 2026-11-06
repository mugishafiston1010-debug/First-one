"use client";
import { useEffect, useState, useTransition } from "react";
import type { PayMethod } from "@prisma/client";
import { Calculator, type CalcLabels, type CalcValue } from "@/components/Calculator";
import { formatMoney, type PriceSettings } from "@/lib/money";
import { PAYOUT_OPTIONS, maskAccount } from "@/lib/providers";
import { addRecipient, getQuote, placeOrder, type QuoteResult } from "@/app/actions/customer";

type Recipient = { id: string; fullName: string; currency: string; method: PayMethod; provider: string; accountNumber: string };
type Quote = Extract<QuoteResult, { ok: true }>["quote"];

export type WizardLabels = CalcLabels & {
  step1: string;
  step2: string;
  step3: string;
  chooseRecipient: string;
  newRecipient: string;
  savedRecipients: string;
  recipientName: string;
  method: string;
  provider: string;
  account: string;
  review: string;
  confirm: string;
  priceLocked: string;
  back: string;
  recipient: string;
  methods: Record<PayMethod, string>;
};

export function SendWizard({
  corridors,
  recipients: initialRecipients,
  labels,
  locale,
  initial,
}: {
  corridors: PriceSettings[];
  recipients: Recipient[];
  labels: WizardLabels;
  locale: string;
  initial: Partial<CalcValue>;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [recipients, setRecipients] = useState(initialRecipients);
  const [chosen, setChosen] = useState<Recipient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const onAmount = (v: CalcValue) =>
    start(async () => {
      setError(null);
      const r = await getQuote(v);
      if (!r.ok) return setError(r.error);
      setQuote(r.quote);
      setChosen(null);
      setStep(2);
    });

  const onConfirm = () =>
    start(async () => {
      if (!quote || !chosen) return;
      setError(null);
      const r = await placeOrder(quote.id, chosen.id);
      // On success the server redirects to the order page.
      if (r && !r.ok) setError(r.error);
    });

  const secondsLeft = quote ? Math.max(0, Math.floor((new Date(quote.expiresAt).getTime() - now) / 1000)) : 0;
  const forCurrency = recipients.filter((r) => r.currency === quote?.to);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <ol className="flex gap-2 text-xs font-semibold">
        {[labels.step1, labels.step2, labels.step3].map((s, i) => (
          <li key={s} className={`flex-1 rounded-full py-1.5 text-center ${step >= i + 1 ? "bg-brand text-white" : "bg-white text-muted border border-line"}`}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      {error && <div className="error" role="alert">{error}</div>}

      {step === 1 && (
        <div className="card">
          <Calculator corridors={corridors} labels={labels} locale={locale} initial={initial} onContinue={onAmount} busy={pending} />
        </div>
      )}

      {step === 2 && quote && (
        <div className="card space-y-5">
          <h2 className="h2">{labels.chooseRecipient}</h2>
          {forCurrency.length > 0 && (
            <div>
              <div className="label">{labels.savedRecipients}</div>
              <div className="space-y-2">
                {forCurrency.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setChosen(r);
                      setStep(3);
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-line px-4 py-3 text-left hover:border-brand"
                  >
                    <span>
                      <span className="block font-semibold">{r.fullName}</span>
                      <span className="text-sm text-muted">
                        {r.provider} · <span className="num">{maskAccount(r.accountNumber)}</span>
                      </span>
                    </span>
                    <span>→</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <NewRecipientForm
            currency={quote.to}
            labels={labels}
            onSaved={(r) => {
              setRecipients((xs) => (xs.some((x) => x.id === r.id) ? xs : [r, ...xs]));
              setChosen(r);
              setStep(3);
            }}
          />
          <button type="button" onClick={() => setStep(1)} className="btn-ghost w-full">← {labels.back}</button>
        </div>
      )}

      {step === 3 && quote && chosen && (
        <div className="card space-y-4">
          <h2 className="h2">{labels.review}</h2>
          <dl className="space-y-2 text-sm">
            <Row k={labels.recipient} v={chosen.fullName} />
            <Row k="" v={`${labels.methods[chosen.method]} · ${chosen.provider} · ${chosen.accountNumber}`} />
            <div className="border-t border-line" />
            <Row k={labels.youSend} v={formatMoney(quote.sendAmount, quote.from, locale)} />
            <Row k={labels.fee} v={formatMoney(quote.fee, quote.from, locale)} />
            <Row k={labels.ourRate} v={`1 ${quote.from} = ${Number(quote.customerRate).toFixed(4)} ${quote.to}`} />
            <Row k={labels.theyGet} v={formatMoney(quote.receiveAmount, quote.to, locale)} strong />
            <div className="border-t border-line" />
            <Row k={labels.youPay} v={formatMoney(quote.totalToPay, quote.from, locale)} strong />
          </dl>
          <p className={`text-sm ${secondsLeft < 60 ? "text-warn" : "text-muted"}`}>
            {labels.priceLocked} {new Date(quote.expiresAt).toLocaleTimeString(locale === "ru" ? "ru-RU" : "en-GB", { hour: "2-digit", minute: "2-digit" })} (
            {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")})
          </p>
          {secondsLeft > 0 ? (
            <button type="button" onClick={onConfirm} disabled={pending} className="btn-primary w-full">
              {pending ? "…" : labels.confirm}
            </button>
          ) : (
            <button type="button" onClick={() => setStep(1)} className="btn-primary w-full">{labels.step1} ↺</button>
          )}
          <button type="button" onClick={() => setStep(2)} className="btn-ghost w-full">← {labels.back}</button>
        </div>
      )}
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{k}</dt>
      <dd className={`num text-right ${strong ? "text-base font-semibold" : ""}`}>{v}</dd>
    </div>
  );
}

export function NewRecipientForm({
  currency,
  labels,
  onSaved,
}: {
  currency: string;
  labels: Pick<WizardLabels, "newRecipient" | "recipientName" | "method" | "provider" | "account" | "methods" | "continue">;
  onSaved: (r: Recipient) => void;
}) {
  const opts = PAYOUT_OPTIONS[currency];
  const methods = Object.keys(opts?.methods ?? {}) as PayMethod[];
  const [method, setMethod] = useState<PayMethod>(methods[0]);
  const providers = opts?.methods[method] ?? [];
  const [provider, setProvider] = useState(providers[0] ?? "");
  const [fullName, setFullName] = useState("");
  const [account, setAccount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!opts) return null;
  const submit = () =>
    start(async () => {
      setError(null);
      const r = await addRecipient({ fullName, currency, method, provider, accountNumber: account });
      if (!r.ok) return setError(r.error);
      onSaved(r.recipient);
    });

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-line p-4">
      <div className="font-semibold">{labels.newRecipient}</div>
      {error && <div className="error">{error}</div>}
      <div>
        <label className="label" htmlFor="rname">{labels.recipientName}</label>
        <input id="rname" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="off" />
      </div>
      <div>
        <div className="label">{labels.method}</div>
        <div className="flex flex-wrap gap-2">
          {methods.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMethod(m);
                setProvider(opts.methods[m]?.[0] ?? "");
              }}
              className={`rounded-xl border px-3 py-2 text-sm font-medium ${m === method ? "border-brand bg-brand-soft text-brand-dark" : "border-line bg-white"}`}
            >
              {labels.methods[m]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label" htmlFor="rprov">{labels.provider}</label>
        <select id="rprov" className="input" value={provider} onChange={(e) => setProvider(e.target.value)}>
          {providers.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="racc">{labels.account}</label>
        <input id="racc" className="input num" inputMode={method === "BANK_ACCOUNT" ? "text" : "tel"} value={account} onChange={(e) => setAccount(e.target.value)} autoComplete="off" />
      </div>
      <button type="button" onClick={submit} disabled={pending || fullName.trim().length < 3 || account.trim().length < 4} className="btn-primary w-full">
        {pending ? "…" : labels.continue}
      </button>
    </div>
  );
}
