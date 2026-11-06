import type { OrderStatus } from "@prisma/client";

const STYLE: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: "bg-amber-50 text-amber-800 border-amber-200",
  PAYMENT_SUBMITTED: "bg-sky-50 text-sky-800 border-sky-200",
  PAYMENT_CONFIRMED: "bg-sky-50 text-sky-800 border-sky-200",
  DELIVERED: "bg-brand-soft text-brand-dark border-brand/20",
  CANCELLED: "bg-gray-100 text-gray-600 border-gray-200",
  EXPIRED: "bg-gray-100 text-gray-600 border-gray-200",
  REFUNDED: "bg-gray-100 text-gray-700 border-gray-200",
};

export function StatusBadge({ status, label }: { status: OrderStatus; label: string }) {
  return <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STYLE[status]}`}>{label}</span>;
}
