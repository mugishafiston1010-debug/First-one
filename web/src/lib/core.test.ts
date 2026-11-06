import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import { priceTransfer, PriceError, type PriceSettings } from "./money";
import { nextStatus, TransitionError } from "./order-state";
import { pickPayInAccount } from "./rotation";
import { assertBalanced, deliveredPostings, paymentConfirmedPostings, refundPostings } from "./ledger-rules";
import { remainingLimit } from "./limits";

const rubRwf: PriceSettings = {
  fromCurrency: "RUB",
  toCurrency: "RWF",
  midRate: "16.50",
  marginBps: 150, // 1.5%
  fixedFee: "100",
  percentFeeBps: 50, // 0.5%
  minSend: "500",
  maxSend: "300000",
};

describe("priceTransfer", () => {
  it("prices from the send amount", () => {
    const p = priceTransfer(rubRwf, { send: "10000" });
    expect(p.fee.toString()).toBe("150"); // 100 + 0.5% of 10,000
    expect(p.totalToPay.toString()).toBe("10150");
    expect(p.customerRate.toString()).toBe("16.2525"); // 16.50 * 0.985
    expect(p.receiveAmount.toString()).toBe("162525"); // RWF has no decimals
    expect(p.marginCost.toString()).toBe("150");
    expect(p.totalCost.toString()).toBe("300");
  });

  it("rounds RWF down and never promises more than the rate gives", () => {
    const p = priceTransfer(rubRwf, { send: "999.99" });
    expect(p.receiveAmount.toString()).toBe("16252"); // 999.99 * 16.2525 = 16252.33...
  });

  it("prices from the receive amount and covers it fully", () => {
    const p = priceTransfer(rubRwf, { receive: "100000" });
    expect(p.receiveAmount.gte(100000)).toBe(true);
    expect(p.receiveAmount.minus(100000).lt(17)).toBe(true); // within one kopeck of rate
  });

  it("enforces limits", () => {
    expect(() => priceTransfer(rubRwf, { send: "100" })).toThrow(PriceError);
    expect(() => priceTransfer(rubRwf, { send: "300001" })).toThrow(PriceError);
    expect(() => priceTransfer(rubRwf, { send: "abc" })).toThrow();
    expect(() => priceTransfer(rubRwf, { send: "-5" })).toThrow(PriceError);
  });

  it("works for the reverse corridor RWF -> RUB", () => {
    const p = priceTransfer(
      { fromCurrency: "RWF", toCurrency: "RUB", midRate: "0.0606", marginBps: 150, fixedFee: "0", percentFeeBps: 100, minSend: "5000", maxSend: "5000000" },
      { send: "100000" },
    );
    expect(p.fee.toString()).toBe("1000");
    expect(p.receiveAmount.toString()).toBe("5969.1"); // 100000 * 0.059691
  });
});

describe("order state machine", () => {
  it("follows the happy path", () => {
    let s = nextStatus("AWAITING_PAYMENT", "SUBMIT_RECEIPT", "customer");
    expect(s).toBe("PAYMENT_SUBMITTED");
    s = nextStatus(s, "CONFIRM_PAYMENT", "admin");
    expect(s).toBe("PAYMENT_CONFIRMED");
    s = nextStatus(s, "MARK_DELIVERED", "admin");
    expect(s).toBe("DELIVERED");
  });

  it("blocks wrong actors and wrong order", () => {
    expect(() => nextStatus("PAYMENT_SUBMITTED", "CONFIRM_PAYMENT", "customer")).toThrow(TransitionError);
    expect(() => nextStatus("AWAITING_PAYMENT", "MARK_DELIVERED", "admin")).toThrow(TransitionError);
    expect(() => nextStatus("DELIVERED", "CANCEL", "admin")).toThrow(TransitionError);
  });

  it("lets a customer cancel only before sending a receipt", () => {
    expect(nextStatus("AWAITING_PAYMENT", "CANCEL", "customer")).toBe("CANCELLED");
    expect(() => nextStatus("PAYMENT_SUBMITTED", "CANCEL", "customer")).toThrow(TransitionError);
    expect(nextStatus("PAYMENT_SUBMITTED", "CANCEL", "admin")).toBe("CANCELLED");
  });

  it("sends a rejected receipt back to payment", () => {
    expect(nextStatus("PAYMENT_SUBMITTED", "REJECT_RECEIPT", "admin")).toBe("AWAITING_PAYMENT");
  });
});

describe("pickPayInAccount", () => {
  const cards = [
    { id: "a", active: true, dailyLimit: "100000", perOrderLimit: "50000", usedToday: "60000" },
    { id: "b", active: true, dailyLimit: "200000", perOrderLimit: "50000", usedToday: "60000" },
    { id: "c", active: false, dailyLimit: "200000", perOrderLimit: "50000", usedToday: "0" },
  ];

  it("picks the least used active card that fits", () => {
    expect(pickPayInAccount(cards, "10000")?.id).toBe("b"); // b is 30% used, a is 60%
  });

  it("skips cards over their limits", () => {
    expect(pickPayInAccount(cards, "45000")?.id).toBe("b"); // a would pass its daily limit
    expect(pickPayInAccount(cards, "60000")).toBeNull(); // above every per-order limit
  });
});

describe("ledger", () => {
  const order = {
    payInAccountId: "card1",
    fromCurrency: "RUB",
    toCurrency: "RWF",
    sendAmount: "10000",
    fee: "150",
    totalToPay: "10150",
    receiveAmount: "162525",
  };

  it("every entry balances per currency", () => {
    expect(() => assertBalanced(paymentConfirmedPostings(order))).not.toThrow();
    expect(() => assertBalanced(deliveredPostings(order))).not.toThrow();
    expect(() => assertBalanced(refundPostings(order))).not.toThrow();
  });

  it("refund empties the pay-in account", () => {
    const all = [...paymentConfirmedPostings(order), ...refundPostings(order)];
    const payin = all.filter((p) => p.account === "payin:card1").reduce((s, p) => s.plus(p.amount), new Decimal(0));
    expect(payin.isZero()).toBe(true);
  });

  it("detects an unbalanced entry", () => {
    expect(() => assertBalanced([{ account: "x", currency: "RUB", amount: new Decimal(1) }])).toThrow();
  });
});

describe("limits", () => {
  it("gives verified users more room", () => {
    expect(remainingLimit("RUB", "NONE", "10000").toString()).toBe("5000");
    expect(remainingLimit("RUB", "APPROVED", "10000").toString()).toBe("590000");
    expect(remainingLimit("RUB", "NONE", "20000").toString()).toBe("0");
  });
});

import { normaliseAccount, luhnOk } from "./providers";

describe("payout account checks", () => {
  it("normalises Rwandan MoMo numbers and checks the network", () => {
    expect(normaliseAccount("RWF", "MOBILE_MONEY", "MTN MoMo", "078 812 3412")).toEqual({ ok: true, value: "+250788123412" });
    expect(normaliseAccount("RWF", "MOBILE_MONEY", "MTN MoMo", "+250 788 123 412")).toEqual({ ok: true, value: "+250788123412" });
    expect(normaliseAccount("RWF", "MOBILE_MONEY", "MTN MoMo", "0728123412").ok).toBe(false);
    expect(normaliseAccount("RWF", "MOBILE_MONEY", "Airtel Money", "0728123412").ok).toBe(true);
    expect(normaliseAccount("RWF", "MOBILE_MONEY", "MTN MoMo", "12345").ok).toBe(false);
  });
  it("normalises Russian SBP phones", () => {
    expect(normaliseAccount("RUB", "SBP_PHONE", "Sberbank", "8 (999) 123-45-67")).toEqual({ ok: true, value: "+79991234567" });
    expect(normaliseAccount("RUB", "SBP_PHONE", "Sberbank", "+7 499 123 45 67").ok).toBe(false);
  });
  it("checks card numbers with Luhn", () => {
    expect(luhnOk("4111111111111111")).toBe(true);
    expect(normaliseAccount("RUB", "CARD", "Sberbank", "4111 1111 1111 1111").ok).toBe(true);
    expect(normaliseAccount("RUB", "CARD", "Sberbank", "4111 1111 1111 1112").ok).toBe(false);
  });
});
