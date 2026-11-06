import Decimal from "decimal.js";

/** What the AI read from the receipt. Every field may be missing. */
export type ReceiptData = {
  is_payment_receipt: boolean;
  status: "success" | "pending" | "failed" | "unknown";
  amount: number | null;
  currency: string | null;
  /** ISO date-time as printed on the receipt (local time if no zone). */
  paid_at: string | null;
  recipient_name: string | null;
  /** Digits of the recipient card / phone / account visible on the receipt (often only the last 4). */
  recipient_account_digits: string | null;
  bank: string | null;
  transaction_id: string | null;
  looks_edited: boolean;
};

export type Verdict = "PASS" | "REVIEW" | "FAIL";
export type Check = { verdict: Verdict; reasons: string[] };

export type OrderFacts = {
  totalToPay: Decimal.Value;
  currency: string;
  createdAt: Date;
  payInHolder: string;
  payInNumber: string;
  /** True when the same transaction ID is already attached to another order. */
  txnIdUsedElsewhere: boolean;
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Rough Cyrillic → Latin so "ИВАН П." matches "IVAN P." */
const CYR: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sh", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};
const latin = (s: string) => [...norm(s)].map((ch) => CYR[ch] ?? ch).join("");

/** Names match if the first word is equal and the next initials agree (banks often show "Ivan P."). */
export function namesMatch(a: string, b: string): boolean {
  const x = latin(a).split(" ").filter(Boolean);
  const y = latin(b).split(" ").filter(Boolean);
  if (!x.length || !y.length) return false;
  if (x[0] !== y[0]) return false;
  const n = Math.min(x.length, y.length);
  for (let i = 1; i < n; i++) if (x[i][0] !== y[i][0]) return false;
  return true;
}

/**
 * Do the visible digits on the receipt fit our pay-in number?
 * Only the digits after the last mask (*, •, x) count, because banks hide the middle.
 * true = they match, false = they do not, null = too few digits visible to tell.
 */
export function accountMatches(receiptDigits: string, payInNumber: string): boolean | null {
  const tail = receiptDigits.split(/[*•xX…]+/).pop() ?? "";
  const r = tail.replace(/\D/g, "");
  const p = payInNumber.replace(/\D/g, "");
  if (r.length < 2) return null;
  const n = Math.min(r.length, 4);
  const ok = p.endsWith(r.slice(-n));
  if (!ok) return false;
  return n >= 4 ? true : null;
}

/**
 * Compare a receipt with its order. FAIL = clear mismatch, REVIEW = a person should look,
 * PASS = everything we could read matches. PASS never means "money received":
 * an admin must still see the money on the account.
 */
export function checkReceipt(d: ReceiptData, o: OrderFacts, now = new Date()): Check {
  const fail: string[] = [];
  const review: string[] = [];

  if (!d.is_payment_receipt) fail.push("This does not look like a payment receipt");
  if (d.status === "failed") fail.push("Receipt shows a failed payment");
  if (d.status === "pending") review.push("Receipt shows the payment as pending");
  if (d.looks_edited) review.push("The image may have been edited");
  if (o.txnIdUsedElsewhere) fail.push("This transaction ID was already used for another order");

  if (d.amount === null) review.push("Amount not readable");
  else {
    const diff = new Decimal(d.amount).minus(o.totalToPay).abs();
    if (diff.gt(0.009)) fail.push(`Amount ${d.amount} does not match ${new Decimal(o.totalToPay).toString()}`);
  }
  if (d.currency && d.currency.toUpperCase() !== o.currency) fail.push(`Currency ${d.currency} instead of ${o.currency}`);

  if (!d.paid_at) review.push("Date not readable");
  else {
    const t = new Date(d.paid_at);
    if (Number.isNaN(t.getTime())) review.push("Date not readable");
    else {
      // With a known time zone the payment must come after the order (10 min clock slack).
      // Without one, receipts print local time, so allow the width of the world's time zones.
      const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(d.paid_at.trim());
      const slack = hasZone ? 10 * 60_000 : 14 * 3600_000;
      const early = o.createdAt.getTime() - slack;
      const late = now.getTime() + slack;
      if (t.getTime() < early) fail.push("Payment is dated before the order was created");
      else if (t.getTime() > late) fail.push("Payment is dated in the future");
    }
  }

  if (!d.recipient_name) review.push("Recipient name not readable");
  else if (!namesMatch(d.recipient_name, o.payInHolder)) fail.push(`Paid to "${d.recipient_name}", expected "${o.payInHolder}"`);

  if (d.recipient_account_digits && accountMatches(d.recipient_account_digits, o.payInNumber) === false)
    fail.push("Card/phone on the receipt is not our account");

  if (!d.transaction_id) review.push("No transaction ID on the receipt");

  if (fail.length) return { verdict: "FAIL", reasons: [...fail, ...review] };
  if (review.length) return { verdict: "REVIEW", reasons: review };
  return { verdict: "PASS", reasons: ["Amount, date, recipient and account match"] };
}
