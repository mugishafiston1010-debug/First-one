import Decimal from "decimal.js";

export { Decimal };

/** Number of decimal places each currency is paid in. */
export const CURRENCIES: Record<string, { decimals: number; symbol: string; name: string; flag: string }> = {
  RUB: { decimals: 2, symbol: "₽", name: "Russian rouble", flag: "🇷🇺" },
  RWF: { decimals: 0, symbol: "FRw", name: "Rwandan franc", flag: "🇷🇼" },
  UGX: { decimals: 0, symbol: "USh", name: "Ugandan shilling", flag: "🇺🇬" },
  KES: { decimals: 2, symbol: "KSh", name: "Kenyan shilling", flag: "🇰🇪" },
  BIF: { decimals: 0, symbol: "FBu", name: "Burundian franc", flag: "🇧🇮" },
};

export function decimalsOf(currency: string): number {
  const c = CURRENCIES[currency];
  if (!c) throw new Error(`Unknown currency ${currency}`);
  return c.decimals;
}

export function formatMoney(value: Decimal.Value, currency: string, locale = "en"): string {
  const d = decimalsOf(currency);
  const n = new Decimal(value).toDecimalPlaces(d, Decimal.ROUND_DOWN).toNumber();
  const num = new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(n);
  return `${num} ${currency}`;
}

export type PriceSettings = {
  fromCurrency: string;
  toCurrency: string;
  midRate: Decimal.Value;
  marginBps: number;
  fixedFee: Decimal.Value;
  percentFeeBps: number;
  minSend: Decimal.Value;
  maxSend: Decimal.Value;
};

export type Price = {
  sendAmount: Decimal;
  fee: Decimal;
  totalToPay: Decimal;
  midRate: Decimal;
  customerRate: Decimal;
  receiveAmount: Decimal;
  /** What the rate margin costs the customer, in the sending currency. Shown openly. */
  marginCost: Decimal;
  /** fee + marginCost: the full real cost of the transfer. */
  totalCost: Decimal;
};

export class PriceError extends Error {
  constructor(
    public code: "BELOW_MIN" | "ABOVE_MAX" | "INVALID_AMOUNT",
    public limit?: Decimal,
  ) {
    super(code);
  }
}

const BPS = new Decimal(10_000);

/**
 * Price a transfer. Give either the amount sent or the amount the recipient must get.
 * The fee is added on top: the customer pays sendAmount + fee, and sendAmount is converted.
 * Rounding always favours the customer by at most one minor unit on the fee side
 * and never promises more than we will pay out on the receive side.
 */
export function priceTransfer(s: PriceSettings, input: { send?: Decimal.Value; receive?: Decimal.Value }): Price {
  const fromDp = decimalsOf(s.fromCurrency);
  const toDp = decimalsOf(s.toCurrency);
  const mid = new Decimal(s.midRate);
  const customerRate = mid.mul(BPS.minus(s.marginBps)).div(BPS).toDecimalPlaces(8, Decimal.ROUND_DOWN);
  if (customerRate.lte(0)) throw new Error("Rate must be positive");

  let send: Decimal;
  if (input.send !== undefined && input.send !== "") {
    send = new Decimal(input.send).toDecimalPlaces(fromDp, Decimal.ROUND_DOWN);
  } else if (input.receive !== undefined && input.receive !== "") {
    const want = new Decimal(input.receive);
    if (!want.isFinite() || want.lte(0)) throw new PriceError("INVALID_AMOUNT");
    send = want.div(customerRate).toDecimalPlaces(fromDp, Decimal.ROUND_UP);
  } else {
    throw new PriceError("INVALID_AMOUNT");
  }
  if (!send.isFinite() || send.lte(0)) throw new PriceError("INVALID_AMOUNT");
  if (send.lt(s.minSend)) throw new PriceError("BELOW_MIN", new Decimal(s.minSend));
  if (send.gt(s.maxSend)) throw new PriceError("ABOVE_MAX", new Decimal(s.maxSend));

  const fee = new Decimal(s.fixedFee)
    .plus(send.mul(s.percentFeeBps).div(BPS))
    .toDecimalPlaces(fromDp, Decimal.ROUND_HALF_UP);
  const receiveAmount = send.mul(customerRate).toDecimalPlaces(toDp, Decimal.ROUND_DOWN);
  const marginCost = send.mul(s.marginBps).div(BPS).toDecimalPlaces(fromDp, Decimal.ROUND_HALF_UP);

  return {
    sendAmount: send,
    fee,
    totalToPay: send.plus(fee),
    midRate: mid,
    customerRate,
    receiveAmount,
    marginCost,
    totalCost: fee.plus(marginCost),
  };
}
