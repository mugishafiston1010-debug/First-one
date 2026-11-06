import "server-only";
import { randomInt } from "node:crypto";
import { addMinutes, startOfDay, subDays } from "date-fns";
import Decimal from "decimal.js";
import { Prisma, type Order, type OrderStatus } from "@prisma/client";
import { db } from "../db";
import { nextStatus, OPEN_STATUSES, type OrderAction } from "../order-state";
import { pickPayInAccount } from "../rotation";
import { assertBalanced, deliveredPostings, paymentConfirmedPostings, refundPostings, type PostingSpec } from "../ledger-rules";
import { MAX_OPEN_ORDERS, PAY_WINDOW_MIN, remainingLimit } from "../limits";

type Tx = Prisma.TransactionClient;

export class OrderError extends Error {
  constructor(public code: "QUOTE_EXPIRED" | "LIMIT" | "TOO_MANY_OPEN" | "NO_PAYIN" | "NOT_FOUND" | "SUSPENDED" | "BAD_RECIPIENT") {
    super(code);
  }
}

const REF_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
function newRef() {
  let s = "";
  for (let i = 0; i < 7; i++) s += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return `IN-${s}`;
}

/** Statuses whose money counts towards limits and card usage. */
const COUNTED: OrderStatus[] = ["AWAITING_PAYMENT", "PAYMENT_SUBMITTED", "PAYMENT_CONFIRMED", "DELIVERED"];

export async function sentLast30Days(userId: string, currency: string, tx: Tx = db) {
  const r = await tx.order.aggregate({
    _sum: { sendAmount: true },
    where: { userId, fromCurrency: currency, status: { in: COUNTED }, createdAt: { gte: subDays(new Date(), 30) } },
  });
  return new Decimal(r._sum.sendAmount?.toString() ?? 0);
}

/** Mark unpaid orders past their deadline as expired. Cheap; called when orders are read. */
export async function expireStaleOrders(where: Prisma.OrderWhereInput = {}) {
  const stale = await db.order.findMany({
    where: { ...where, status: "AWAITING_PAYMENT", payBy: { lt: new Date() } },
    select: { id: true },
  });
  for (const o of stale) {
    await db.$transaction(async (tx) => {
      const n = await tx.order.updateMany({ where: { id: o.id, status: "AWAITING_PAYMENT" }, data: { status: "EXPIRED" } });
      if (n.count) await tx.orderEvent.create({ data: { orderId: o.id, status: "EXPIRED", note: "No payment before the deadline" } });
    });
  }
}

/**
 * Turn a locked quote into an order: checks limits, picks the pay-in account,
 * and stores a copy of the recipient. Runs under a lock so two orders can never
 * push the same card over its daily limit.
 */
export async function createOrder(userId: string, quoteId: string, recipientId: string): Promise<Order> {
  return db.$transaction(
    async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (user.suspended) throw new OrderError("SUSPENDED");

      const quote = await tx.quote.findFirst({ where: { id: quoteId, userId }, include: { corridor: true } });
      if (!quote || quote.usedAt || quote.expiresAt < new Date() || !quote.corridor.enabled) throw new OrderError("QUOTE_EXPIRED");

      const recipient = await tx.recipient.findFirst({ where: { id: recipientId, userId, archived: false } });
      if (!recipient || recipient.currency !== quote.corridor.toCurrency) throw new OrderError("BAD_RECIPIENT");

      const from = quote.corridor.fromCurrency;
      // One lock per sending currency: serialises card selection and limit checks.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"payin:" + from}))`;

      const open = await tx.order.count({ where: { userId, status: { in: OPEN_STATUSES } } });
      if (open >= MAX_OPEN_ORDERS) throw new OrderError("TOO_MANY_OPEN");

      const remaining = remainingLimit(from, user.kycStatus, await sentLast30Days(userId, from, tx));
      if (new Decimal(quote.sendAmount.toString()).gt(remaining)) throw new OrderError("LIMIT");

      const accounts = await tx.payInAccount.findMany({ where: { currency: from, active: true } });
      const used = await tx.order.groupBy({
        by: ["payInAccountId"],
        _sum: { totalToPay: true },
        where: { payInAccountId: { in: accounts.map((a) => a.id) }, status: { in: COUNTED }, createdAt: { gte: startOfDay(new Date()) } },
      });
      const usedMap = new Map(used.map((u) => [u.payInAccountId, u._sum.totalToPay?.toString() ?? "0"]));
      const account = pickPayInAccount(
        accounts.map((a) => ({
          ...a,
          dailyLimit: a.dailyLimit.toString(),
          perOrderLimit: a.perOrderLimit.toString(),
          usedToday: usedMap.get(a.id) ?? "0",
        })),
        quote.totalToPay.toString(),
      );
      if (!account) throw new OrderError("NO_PAYIN");

      await tx.quote.update({ where: { id: quote.id }, data: { usedAt: new Date() } });

      const order = await tx.order.create({
        data: {
          ref: newRef(),
          userId,
          corridorId: quote.corridorId,
          fromCurrency: from,
          toCurrency: quote.corridor.toCurrency,
          sendAmount: quote.sendAmount,
          fee: quote.fee,
          totalToPay: quote.totalToPay,
          midRate: quote.midRate,
          customerRate: quote.customerRate,
          receiveAmount: quote.receiveAmount,
          recipientId: recipient.id,
          recipientName: recipient.fullName,
          recipientMethod: recipient.method,
          recipientProvider: recipient.provider,
          recipientAccount: recipient.accountNumber,
          payInAccountId: account.id,
          payBy: addMinutes(new Date(), PAY_WINDOW_MIN),
        },
      });
      await tx.orderEvent.create({ data: { orderId: order.id, status: order.status, actorId: userId, note: "Order created" } });
      return order;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
  );
}

async function post(tx: Tx, orderId: string, memo: string, postings: PostingSpec[]) {
  assertBalanced(postings);
  const entry = await tx.journalEntry.create({ data: { orderId, memo } });
  for (const p of postings) {
    const account = await tx.ledgerAccount.upsert({
      where: { code: p.account },
      update: {},
      create: { code: p.account, name: p.account, currency: p.currency },
    });
    if (account.currency !== p.currency) throw new Error(`Currency mismatch on ${p.account}`);
    await tx.posting.create({ data: { entryId: entry.id, accountId: account.id, amount: p.amount.toString() } });
  }
}

/**
 * Move an order to its next status. Checks who may do it, records the event,
 * and writes the ledger entries in the same database transaction.
 */
export async function transition(
  orderId: string,
  action: OrderAction,
  actor: { id: string | null; kind: "customer" | "admin" | "system" },
  extra: { note?: string; data?: Prisma.OrderUpdateInput } = {},
) {
  return db.$transaction(async (tx) => {
    // Lock the row so two admins cannot confirm the same order twice.
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new OrderError("NOT_FOUND");
    if (actor.kind === "customer" && order.userId !== actor.id) throw new OrderError("NOT_FOUND");

    const to = nextStatus(order.status, action, actor.kind);
    const now = new Date();
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        ...extra.data,
        status: to,
        ...(to === "PAYMENT_CONFIRMED" ? { confirmedAt: now } : {}),
        ...(to === "DELIVERED" ? { deliveredAt: now } : {}),
        ...(to === "AWAITING_PAYMENT" ? { payBy: addMinutes(now, PAY_WINDOW_MIN) } : {}),
      },
    });
    await tx.orderEvent.create({ data: { orderId: order.id, status: to, actorId: actor.id, note: extra.note } });

    const money = {
      payInAccountId: order.payInAccountId,
      fromCurrency: order.fromCurrency,
      toCurrency: order.toCurrency,
      sendAmount: order.sendAmount.toString(),
      fee: order.fee.toString(),
      totalToPay: order.totalToPay.toString(),
      receiveAmount: order.receiveAmount.toString(),
    };
    if (to === "PAYMENT_CONFIRMED") await post(tx, order.id, `Payment received ${order.ref}`, paymentConfirmedPostings(money));
    if (to === "DELIVERED") await post(tx, order.id, `Paid out ${order.ref}`, deliveredPostings(money));
    if (to === "REFUNDED") await post(tx, order.id, `Refund ${order.ref}`, refundPostings(money));
    return updated;
  });
}
