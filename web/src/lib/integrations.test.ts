import { describe, expect, it } from "vitest";
import { accountMatches, checkReceipt, namesMatch, type ReceiptData } from "./receipt-rules";
import { customerMessage } from "./notify/messages";

const order = {
  totalToPay: "10150",
  currency: "RUB",
  createdAt: new Date("2026-11-06T16:00:00Z"),
  payInHolder: "IVAN P.",
  payInNumber: "2202 2000 0000 0001",
  txnIdUsedElsewhere: false,
};
const good: ReceiptData = {
  is_payment_receipt: true,
  status: "success",
  amount: 10150,
  currency: "RUB",
  paid_at: "2026-11-06T19:05:00+03:00",
  recipient_name: "Иван Петрович П.",
  recipient_account_digits: "0001",
  bank: "Sberbank",
  transaction_id: "A123456789",
  looks_edited: false,
};
const now = new Date("2026-11-06T16:10:00Z");

describe("receipt rules", () => {
  it("passes a matching receipt (Cyrillic name vs Latin)", () => {
    expect(checkReceipt(good, order, now)).toEqual({ verdict: "PASS", reasons: ["Amount, date, recipient and account match"] });
  });
  it("fails a wrong amount", () => {
    const r = checkReceipt({ ...good, amount: 1015 }, order, now);
    expect(r.verdict).toBe("FAIL");
    expect(r.reasons[0]).toMatch(/Amount/);
  });
  it("fails a payment to someone else", () => {
    expect(checkReceipt({ ...good, recipient_name: "Anna S." }, order, now).verdict).toBe("FAIL");
    expect(checkReceipt({ ...good, recipient_account_digits: "9999" }, order, now).verdict).toBe("FAIL");
  });
  it("fails an old receipt from before the order", () => {
    expect(checkReceipt({ ...good, paid_at: "2026-11-05T19:05:00+03:00" }, order, now).verdict).toBe("FAIL");
  });
  it("fails a reused transaction id and a non-receipt", () => {
    expect(checkReceipt(good, { ...order, txnIdUsedElsewhere: true }, now).verdict).toBe("FAIL");
    expect(checkReceipt({ ...good, is_payment_receipt: false }, order, now).verdict).toBe("FAIL");
  });
  it("asks for review when something is unreadable or edited", () => {
    expect(checkReceipt({ ...good, transaction_id: null }, order, now).verdict).toBe("REVIEW");
    expect(checkReceipt({ ...good, looks_edited: true }, order, now).verdict).toBe("REVIEW");
    expect(checkReceipt({ ...good, status: "pending" }, order, now).verdict).toBe("REVIEW");
  });
  it("matches names and accounts sensibly", () => {
    expect(namesMatch("IVAN P.", "Иван П.")).toBe(true);
    expect(namesMatch("Ivan Petrov", "Ivan P")).toBe(true);
    expect(namesMatch("Ivan Petrov", "Ivan S")).toBe(false);
    expect(accountMatches("•••• 0001", "2202 2000 0000 0001")).toBe(true);
    expect(accountMatches("+7 900 *** ** 02", "+7 900 000-00-02")).toBe(null); // only "02" visible after the mask: cannot tell
    expect(accountMatches("+7 900 *** ** 05", "+7 900 000-00-02")).toBe(false);
    expect(accountMatches("0002", "+7 900 000-00-02")).toBe(true);
    expect(accountMatches("**** 4417", "2202 2000 0000 0001")).toBe(false);
  });
});

describe("notification texts", () => {
  const info = { ref: "IN-ABC", totalToPay: "10150", fromCurrency: "RUB", receiveAmount: "160752", toCurrency: "RWF", recipientName: "Jean", payBy: new Date("2026-11-06T16:30:00Z") };
  it("writes in the customer's language with the link", () => {
    const en = customerMessage("DELIVERED", info, "en", "https://x/app/orders/IN-ABC");
    expect(en).toContain("Jean received 160,752 RWF");
    expect(en).toContain("https://x/app/orders/IN-ABC");
    const ru = customerMessage("CREATED", info, "ru", "L");
    expect(ru).toContain("Заказ IN-ABC создан");
    expect(ru).toContain("19:30 MSK");
  });
});
