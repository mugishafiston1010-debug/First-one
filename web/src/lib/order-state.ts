import type { OrderStatus } from "@prisma/client";

export type OrderAction =
  | "SUBMIT_RECEIPT" // customer uploads the payment receipt
  | "CONFIRM_PAYMENT" // admin sees the money arrived on the pay-in account
  | "REJECT_RECEIPT" // admin: receipt wrong or money not there, customer must pay / upload again
  | "MARK_DELIVERED" // admin: recipient was paid, proof attached
  | "CANCEL" // customer (before paying) or admin
  | "EXPIRE" // system: no receipt before the deadline
  | "REFUND"; // admin: money returned to the customer after payment was confirmed

type Rule = { from: OrderStatus[]; to: OrderStatus; by: ("customer" | "admin" | "system")[] };

export const TRANSITIONS: Record<OrderAction, Rule> = {
  SUBMIT_RECEIPT: { from: ["AWAITING_PAYMENT"], to: "PAYMENT_SUBMITTED", by: ["customer"] },
  CONFIRM_PAYMENT: { from: ["PAYMENT_SUBMITTED", "AWAITING_PAYMENT", "EXPIRED"], to: "PAYMENT_CONFIRMED", by: ["admin"] },
  REJECT_RECEIPT: { from: ["PAYMENT_SUBMITTED"], to: "AWAITING_PAYMENT", by: ["admin"] },
  MARK_DELIVERED: { from: ["PAYMENT_CONFIRMED"], to: "DELIVERED", by: ["admin"] },
  CANCEL: { from: ["AWAITING_PAYMENT", "PAYMENT_SUBMITTED"], to: "CANCELLED", by: ["customer", "admin"] },
  EXPIRE: { from: ["AWAITING_PAYMENT"], to: "EXPIRED", by: ["system"] },
  REFUND: { from: ["PAYMENT_CONFIRMED"], to: "REFUNDED", by: ["admin"] },
};

export class TransitionError extends Error {}

export function nextStatus(current: OrderStatus, action: OrderAction, actor: "customer" | "admin" | "system"): OrderStatus {
  const rule = TRANSITIONS[action];
  if (!rule.by.includes(actor)) throw new TransitionError(`${actor} cannot ${action}`);
  // A customer may cancel only before they have sent a receipt.
  if (action === "CANCEL" && actor === "customer" && current !== "AWAITING_PAYMENT") {
    throw new TransitionError("Order can no longer be cancelled by the customer");
  }
  if (!rule.from.includes(current)) throw new TransitionError(`Cannot ${action} an order that is ${current}`);
  return rule.to;
}

export const OPEN_STATUSES: OrderStatus[] = ["AWAITING_PAYMENT", "PAYMENT_SUBMITTED", "PAYMENT_CONFIRMED"];

/** The customer-facing step index (0..3) for the progress bar. */
export function stepOf(status: OrderStatus): number {
  switch (status) {
    case "AWAITING_PAYMENT":
      return 0;
    case "PAYMENT_SUBMITTED":
      return 1;
    case "PAYMENT_CONFIRMED":
      return 2;
    case "DELIVERED":
      return 3;
    default:
      return -1;
  }
}
