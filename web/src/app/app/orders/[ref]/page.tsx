import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getT, type TKey } from "@/lib/i18n";
import { expireStaleOrders } from "@/lib/services/orders";
import { formatMoney } from "@/lib/money";
import { fmtDate } from "@/lib/format";
import { stepOf } from "@/lib/order-state";
import { whatsappLink } from "@/lib/brand";
import { cancelOrder } from "@/app/actions/customer";
import { StatusBadge } from "@/components/StatusBadge";
import { CopyButton } from "@/components/CopyButton";
import { Countdown } from "@/components/Countdown";
import { ReceiptUpload } from "@/components/ReceiptUpload";

export default async function OrderPage({ params }: { params: Promise<{ ref: string }> }) {
  const user = await requireUser();
  const { ref } = await params;
  const { t, locale } = await getT();
  await expireStaleOrders({ userId: user.id, ref });
  const o = await db.order.findFirst({
    where: { ref, userId: user.id },
    include: { payInAccount: true, events: { orderBy: { createdAt: "asc" } } },
  });
  if (!o) notFound();

  const step = stepOf(o.status);
  const steps: TKey[] = ["order.step.pay", "order.step.check", "order.step.payout", "order.step.done"];
  const acc = o.payInAccount;
  const copy = { label: t("order.copy"), done: t("order.copied") };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted">{t("order.ref")}</div>
          <h1 className="num text-2xl font-bold">{o.ref}</h1>
        </div>
        <StatusBadge status={o.status} label={t(`order.status.${o.status}` as TKey)} />
      </div>

      {step >= 0 && (
        <ol className="grid grid-cols-4 gap-1.5 text-center text-xs font-semibold">
          {steps.map((s, i) => (
            <li key={s}>
              <div className={`h-1.5 rounded-full ${i <= step ? "bg-brand" : "bg-line"}`} />
              <div className={`mt-1.5 ${i <= step ? "text-ink" : "text-muted"}`}>{t(s)}</div>
            </li>
          ))}
        </ol>
      )}

      {o.status === "AWAITING_PAYMENT" && (
        <div className="card space-y-4 border-brand/30">
          <div>
            <div className="text-sm text-muted">{t("order.payTitle")}</div>
            <div className="flex items-center justify-between gap-3">
              <div className="num text-3xl font-bold">{formatMoney(o.totalToPay, o.fromCurrency, locale)}</div>
              <CopyButton value={o.totalToPay.toString()} {...copy} />
            </div>
          </div>
          <div className="space-y-2 rounded-xl bg-paper p-4 text-sm">
            <div className="text-muted">{t("order.payTo")}</div>
            <Line k={t("order.bank")} v={`${acc.provider} · ${t(`method.${acc.method}` as TKey)}`} />
            <Line k={t("order.number")} v={acc.accountNumber} copy={{ ...copy, value: acc.accountNumber.replace(/[\s-]/g, "") }} mono />
            <Line k={t("order.holder")} v={acc.holderName} copy={{ ...copy, value: acc.holderName }} />
          </div>
          <p className="text-sm text-muted">{t("order.payRules")}</p>
          <p className="text-sm">
            {t("order.payBy")} {fmtDate(o.payBy, locale)} — <Countdown until={o.payBy.toISOString()} />
          </p>
          <div className="border-t border-line pt-4">
            <ReceiptUpload orderRef={o.ref} labels={{ title: t("order.uploadTitle"), hint: t("order.uploadHint"), button: t("order.uploadBtn") }} />
          </div>
          <form action={cancelOrder}>
            <input type="hidden" name="ref" value={o.ref} />
            <button className="btn-danger w-full">{t("order.cancel")}</button>
          </form>
        </div>
      )}

      {o.status === "PAYMENT_SUBMITTED" && <div className="notice">{t("order.submitted")}</div>}
      {o.status === "PAYMENT_CONFIRMED" && <div className="notice">{t("order.confirmed")}</div>}
      {o.status === "DELIVERED" && <div className="notice font-semibold">{t("order.delivered")}</div>}
      {o.status === "EXPIRED" && <div className="error">{t("order.expired")}</div>}

      <div className="card space-y-2 text-sm">
        <h2 className="mb-2 font-bold">{t("order.summary")}</h2>
        <Line k={t("order.recipient")} v={o.recipientName} />
        <Line k="" v={`${o.recipientProvider} · ${o.recipientAccount}`} mono />
        <div className="border-t border-line" />
        <Line k={t("calc.youSend")} v={formatMoney(o.sendAmount, o.fromCurrency, locale)} mono />
        <Line k={t("calc.fee")} v={formatMoney(o.fee, o.fromCurrency, locale)} mono />
        <Line k={t("calc.ourRate")} v={`1 ${o.fromCurrency} = ${o.customerRate.toDecimalPlaces(4).toString()} ${o.toCurrency}`} mono />
        <Line k={t("calc.theyGet")} v={formatMoney(o.receiveAmount, o.toCurrency, locale)} mono strong />
        {o.receiptFileId && (
          <a className="block pt-2 font-semibold text-brand" href={`/api/files/${o.receiptFileId}`} target="_blank">{t("order.receipt")} ↗</a>
        )}
        {o.payoutProofFileId && (
          <a className="block font-semibold text-brand" href={`/api/files/${o.payoutProofFileId}`} target="_blank">{t("order.proof")} ↗</a>
        )}
        {o.payoutReference && <Line k={t("order.proof")} v={o.payoutReference} mono />}
      </div>

      <div className="card">
        <h2 className="mb-3 font-bold">{t("order.timeline")}</h2>
        <ol className="space-y-3 border-l-2 border-line pl-4 text-sm">
          {o.events.map((e) => (
            <li key={e.id}>
              <div className="font-semibold">{t(`order.status.${e.status}` as TKey)}</div>
              <div className="text-xs text-muted">{fmtDate(e.createdAt, locale)}</div>
            </li>
          ))}
        </ol>
      </div>

      <a href={whatsappLink(`${t("order.ref")} ${o.ref}`)} target="_blank" rel="noreferrer" className="btn-ghost w-full">
        {t("order.help")} (WhatsApp)
      </a>
    </div>
  );
}

function Line({ k, v, copy, mono, strong }: { k: string; v: string; copy?: { value: string; label: string; done: string }; mono?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{k}</span>
      <span className="flex min-w-0 items-center gap-2">
        <span className={`truncate text-right ${mono ? "num" : ""} ${strong ? "font-semibold" : "font-medium"}`}>{v}</span>
        {copy && <CopyButton {...copy} />}
      </span>
    </div>
  );
}
