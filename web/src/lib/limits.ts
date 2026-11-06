import Decimal from "decimal.js";
import type { KycStatus } from "@prisma/client";

/**
 * Sending limits, in the sending currency, over the last 30 days.
 * Without a verified identity a customer can only send a small amount,
 * which keeps fraud and money-laundering risk low (and protects the agent cards).
 */
export const LIMITS_30D: Record<string, { unverified: number; verified: number }> = {
  RUB: { unverified: 15_000, verified: 600_000 },
  RWF: { unverified: 250_000, verified: 10_000_000 },
};

/** Maximum open (unpaid or in-progress) orders per customer at once. */
export const MAX_OPEN_ORDERS = 3;

/** Minutes the customer has to pay and upload the receipt. */
export const PAY_WINDOW_MIN = 30;

/** Minutes a price quote stays locked. */
export const QUOTE_TTL_MIN = 15;

export function remainingLimit(currency: string, kyc: KycStatus, sentLast30d: Decimal.Value): Decimal {
  const l = LIMITS_30D[currency];
  if (!l) return new Decimal(0);
  const cap = kyc === "APPROVED" ? l.verified : l.unverified;
  return Decimal.max(0, new Decimal(cap).minus(sentLast30d));
}
