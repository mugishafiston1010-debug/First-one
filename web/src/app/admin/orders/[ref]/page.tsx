import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { fmtDate } from "@/lib/format";
import { en } from "@/lib/i18n/en";
import { adminOrderAction } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { StatusBadge } from "@/components/StatusBadge";
import { CopyButton } from "@/components/CopyButton";
import { sentLast30Days } from "@/lib/services/orders";

export default async function AdminOrder({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const o = await db.order.findUnique({
    where: { ref },
    include: { user: true, payInAccount: true, events: { orderBy: { createdAt: "asc" } }, entries: { include: { postings: { include: { account: true } } } } },
  });
  if (!o) notFound();
  const [sent30, orderCount] = await Promise.all([sentLast30Days(o.userId, o.fromCurrency), db.order.count({ where: { userId: o.userId, status: "DELIVERED" } })]);
  const hidden = (action: string) => (
    <>
      <input type="hidden" name="orderId" value={o.id} />
      <input type="hidden" name="action" value={action} />
    </>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="num text-2xl font-bold">{o.ref}</h1>
          <StatusBadge status={o.status} label={en[`order.status.${o.status}`]} />
        </div>

        <div className="card grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <h2 className="mb-2 font-bold">Money in</h2>
            <p className="num text-2xl font-bold">{formatMoney(o.totalToPay, o.fromCurrency)}</p>
            <p className="text-muted">
              send {formatMoney(o.sendAmount, o.fromCurrency)} + fee {formatMoney(o.fee, o.fromCurrency)}
            </p>
            <p className="mt-2">
              to <b>{o.payInAccount.label}</b>
              <br />
              {o.payInAccount.provider} · <span className="num">{o.payInAccount.accountNumber}</span> · {o.payInAccount.holderName}
            </p>
            {o.receiptFileId ? (
              <a href={`/api/files/${o.receiptFileId}`} target="_blank" className="mt-2 inline-block font-semibold text-brand">Open customer receipt ↗</a>
            ) : (
              <p className="mt-2 text-warn">No receipt uploaded</p>
            )}
          </div>
          <div>
            <h2 className="mb-2 font-bold">Money out</h2>
            <div className="flex items-center gap-2">
              <p className="num text-2xl font-bold">{formatMoney(o.receiveAmount, o.toCurrency)}</p>
              <CopyButton value={o.receiveAmount.toString()} label="Copy" done="Copied" />
            </div>
            <p className="text-muted">
              rate {o.customerRate.toString()} (market {o.midRate.toString()})
            </p>
            <p className="mt-2">
              <b>{o.recipientName}</b> <CopyButton value={o.recipientName} label="Copy" done="Copied" />
              <br />
              {en[`method.${o.recipientMethod}`]} · {o.recipientProvider}
            </p>
            <p className="flex items-center gap-2">
              <span className="num">{o.recipientAccount}</span> <CopyButton value={o.recipientAccount} label="Copy" done="Copied" />
            </p>
            {o.payoutReference && <p className="mt-2">Payout ref: <span className="num">{o.payoutReference}</span></p>}
            {o.payoutProofFileId && <a href={`/api/files/${o.payoutProofFileId}`} target="_blank" className="font-semibold text-brand">Payout proof ↗</a>}
          </div>
        </div>

        <div className="card text-sm">
          <h2 className="mb-2 font-bold">Customer</h2>
          <p>
            <b>{o.user.fullName}</b> · {o.user.email} · {o.user.phone ?? "no phone"}
          </p>
          <p className="text-muted">
            Identity: <b>{o.user.kycStatus}</b> · delivered orders: {orderCount} · sent last 30 days: {formatMoney(sent30, o.fromCurrency)}
            {o.user.suspended && <b className="text-danger"> · SUSPENDED</b>}
          </p>
          <Link href={`/admin?q=${encodeURIComponent(o.user.email)}`} className="font-semibold text-brand">All orders of this customer →</Link>
        </div>

        <div className="card text-sm">
          <h2 className="mb-2 font-bold">History</h2>
          <ol className="space-y-1">
            {o.events.map((e) => (
              <li key={e.id}>
                <span className="num text-muted">{fmtDate(e.createdAt, "en")}</span> — <b>{en[`order.status.${e.status}`]}</b>
                {e.note && <span className="text-muted"> · {e.note}</span>}
              </li>
            ))}
          </ol>
          {o.entries.length > 0 && (
            <>
              <h2 className="mt-4 mb-2 font-bold">Ledger</h2>
              {o.entries.map((j) => (
                <div key={j.id} className="mb-2">
                  <div className="text-muted">{j.memo}</div>
                  {j.postings.map((p) => (
                    <div key={p.id} className="num flex justify-between">
                      <span>{p.account.code}</span>
                      <span>{p.amount.toString()} {p.account.currency}</span>
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <aside className="space-y-3">
        {(o.status === "PAYMENT_SUBMITTED" || o.status === "AWAITING_PAYMENT" || o.status === "EXPIRED") && (
          <div className="card">
            <ActionForm action={adminOrderAction} submit="Confirm money received">
              {hidden("CONFIRM_PAYMENT")}
              <p className="text-sm">
                Only confirm after you see <b className="num">{formatMoney(o.totalToPay, o.fromCurrency)}</b> on <b>{o.payInAccount.label}</b>. The receipt alone is not proof.
              </p>
              <input name="note" className="input" placeholder="Bank transaction ID (optional)" />
            </ActionForm>
          </div>
        )}
        {o.status === "PAYMENT_SUBMITTED" && (
          <div className="card">
            <ActionForm action={adminOrderAction} submit="Reject receipt" danger>
              {hidden("REJECT_RECEIPT")}
              <input name="note" className="input" placeholder="Reason, shown in history" required />
            </ActionForm>
          </div>
        )}
        {o.status === "PAYMENT_CONFIRMED" && (
          <div className="card">
            <ActionForm action={adminOrderAction} submit="Mark delivered">
              {hidden("MARK_DELIVERED")}
              <p className="text-sm">Pay {formatMoney(o.receiveAmount, o.toCurrency)} to {o.recipientName}, then attach the proof.</p>
              <input name="payoutReference" className="input" placeholder="MoMo / bank transaction ID" />
              <input name="proof" type="file" accept="image/*,application/pdf" className="block w-full text-sm" />
            </ActionForm>
          </div>
        )}
        {o.status === "PAYMENT_CONFIRMED" && (
          <div className="card">
            <ActionForm action={adminOrderAction} submit="Refund customer" danger>
              {hidden("REFUND")}
              <p className="text-sm">Only after the money was sent back to the customer.</p>
              <input name="note" className="input" placeholder="Reason and refund transaction ID" required />
            </ActionForm>
          </div>
        )}
        {(o.status === "AWAITING_PAYMENT" || o.status === "PAYMENT_SUBMITTED") && (
          <div className="card">
            <ActionForm action={adminOrderAction} submit="Cancel order" danger>
              {hidden("CANCEL")}
              <input name="note" className="input" placeholder="Reason" required />
            </ActionForm>
          </div>
        )}
      </aside>
    </div>
  );
}
