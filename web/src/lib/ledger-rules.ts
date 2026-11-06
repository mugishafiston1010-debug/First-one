import Decimal from "decimal.js";

export type PostingSpec = { account: string; currency: string; amount: Decimal };

/**
 * Account codes:
 *  payin:<id>            money we hold on a pay-in account (agent card / number)   asset
 *  fee_revenue:<CUR>     our fees                                                   income
 *  fx:<CUR>              currency exchange position (one leg per currency)          equity
 *  payout_due:<CUR>      what we owe recipients                                     liability
 *  payout_float:<CUR>    money paid out to recipients from our float in that country asset
 */

/** Payment from the customer confirmed: book the money in, the fee, and the conversion. */
export function paymentConfirmedPostings(o: {
  payInAccountId: string;
  fromCurrency: string;
  toCurrency: string;
  sendAmount: Decimal.Value;
  fee: Decimal.Value;
  totalToPay: Decimal.Value;
  receiveAmount: Decimal.Value;
}): PostingSpec[] {
  const total = new Decimal(o.totalToPay);
  const fee = new Decimal(o.fee);
  const send = new Decimal(o.sendAmount);
  const recv = new Decimal(o.receiveAmount);
  return [
    { account: `payin:${o.payInAccountId}`, currency: o.fromCurrency, amount: total },
    { account: `fee_revenue:${o.fromCurrency}`, currency: o.fromCurrency, amount: fee.neg() },
    { account: `fx:${o.fromCurrency}`, currency: o.fromCurrency, amount: send.neg() },
    { account: `fx:${o.toCurrency}`, currency: o.toCurrency, amount: recv },
    { account: `payout_due:${o.toCurrency}`, currency: o.toCurrency, amount: recv.neg() },
  ];
}

/** Recipient was paid out. */
export function deliveredPostings(o: { toCurrency: string; receiveAmount: Decimal.Value }): PostingSpec[] {
  const recv = new Decimal(o.receiveAmount);
  return [
    { account: `payout_due:${o.toCurrency}`, currency: o.toCurrency, amount: recv },
    { account: `payout_float:${o.toCurrency}`, currency: o.toCurrency, amount: recv.neg() },
  ];
}

/**
 * Payment was confirmed but the transfer is refunded: exact reversal of the confirmation.
 * The full amount (fee included) leaves the pay-in account back to the customer.
 */
export function refundPostings(o: Parameters<typeof paymentConfirmedPostings>[0]): PostingSpec[] {
  return paymentConfirmedPostings(o).map((p) => ({ ...p, amount: p.amount.neg() }));
}

/** Every journal entry must sum to zero in each currency. */
export function assertBalanced(postings: PostingSpec[]): void {
  const sums = new Map<string, Decimal>();
  for (const p of postings) sums.set(p.currency, (sums.get(p.currency) ?? new Decimal(0)).plus(p.amount));
  for (const [cur, sum] of sums) {
    if (!sum.isZero()) throw new Error(`Unbalanced entry in ${cur}: ${sum.toString()}`);
  }
}
