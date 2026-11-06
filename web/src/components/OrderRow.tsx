import Link from "next/link";
import type { Order } from "@prisma/client";
import { StatusBadge } from "./StatusBadge";
import { formatMoney } from "@/lib/money";
import { fmtDate } from "@/lib/format";

export function OrderRow({ o, href, statusLabel, locale, extra }: { o: Order; href: string; statusLabel: string; locale: string; extra?: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-paper">
      <div className="min-w-0">
        <div className="truncate font-semibold">{o.recipientName}</div>
        <div className="num text-sm text-muted">
          {formatMoney(o.sendAmount, o.fromCurrency, locale)} → {formatMoney(o.receiveAmount, o.toCurrency, locale)}
        </div>
        <div className="text-xs text-muted">{o.ref} · {fmtDate(o.createdAt, locale)}{extra}</div>
      </div>
      <StatusBadge status={o.status} label={statusLabel} />
    </Link>
  );
}
