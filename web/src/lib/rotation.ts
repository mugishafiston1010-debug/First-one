import Decimal from "decimal.js";

export type CandidateAccount = {
  id: string;
  active: boolean;
  dailyLimit: Decimal.Value;
  perOrderLimit: Decimal.Value;
  /** Sum of today's non-cancelled orders already sent to this account. */
  usedToday: Decimal.Value;
};

/**
 * Pick which pay-in account (agent card / number) the customer should pay.
 * Rules: account must be active, the order must fit its per-order limit and
 * the rest of its daily limit. Among those, choose the least-used one today,
 * so money is spread across cards and no card hits bank alarm thresholds.
 */
export function pickPayInAccount<T extends CandidateAccount>(accounts: T[], amount: Decimal.Value): T | null {
  const amt = new Decimal(amount);
  const fitting = accounts.filter(
    (a) =>
      a.active &&
      amt.lte(a.perOrderLimit) &&
      new Decimal(a.usedToday).plus(amt).lte(a.dailyLimit),
  );
  if (fitting.length === 0) return null;
  fitting.sort((a, b) => {
    // Lowest share of the daily limit used first; ties broken by id for stable results.
    const ra = new Decimal(a.usedToday).div(a.dailyLimit);
    const rb = new Decimal(b.usedToday).div(b.dailyLimit);
    const c = ra.comparedTo(rb);
    return c !== 0 ? c : a.id.localeCompare(b.id);
  });
  return fitting[0];
}
