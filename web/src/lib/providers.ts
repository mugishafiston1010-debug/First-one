import type { PayMethod } from "@prisma/client";

/** Where money can be paid out, per receiving currency. */
export const PAYOUT_OPTIONS: Record<string, { country: string; methods: Partial<Record<PayMethod, string[]>> }> = {
  RWF: {
    country: "Rwanda",
    methods: {
      MOBILE_MONEY: ["MTN MoMo", "Airtel Money"],
      BANK_ACCOUNT: ["Bank of Kigali", "Equity Bank Rwanda", "I&M Bank Rwanda", "BPR Bank Rwanda", "Access Bank Rwanda", "Ecobank Rwanda", "KCB Rwanda"],
    },
  },
  RUB: {
    country: "Russia",
    methods: {
      SBP_PHONE: ["Sberbank", "T-Bank", "VTB", "Alfa-Bank", "Raiffeisenbank", "Other bank"],
      CARD: ["Sberbank", "T-Bank", "VTB", "Alfa-Bank", "Raiffeisenbank", "Other bank"],
    },
  },
};

export function luhnOk(digits: string): boolean {
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

export type AccountCheck = { ok: true; value: string } | { ok: false; error: string };

/** Check and normalise a payout number for a method/provider. */
export function normaliseAccount(currency: string, method: PayMethod, provider: string, raw: string): AccountCheck {
  const v = raw.trim();
  const digits = v.replace(/[^\d]/g, "");
  if (currency === "RWF" && method === "MOBILE_MONEY") {
    // Accept 078xxxxxxx, 78xxxxxxx, +25078xxxxxxx
    const local = digits.startsWith("250") ? digits.slice(3) : digits.startsWith("0") ? digits.slice(1) : digits;
    if (!/^7[2389]\d{7}$/.test(local)) return { ok: false, error: "Enter a Rwandan number like 078 123 4567" };
    const prefix = local.slice(0, 2);
    if (provider === "MTN MoMo" && !["78", "79"].includes(prefix)) return { ok: false, error: "MTN numbers start with 078 or 079" };
    if (provider === "Airtel Money" && !["72", "73"].includes(prefix)) return { ok: false, error: "Airtel numbers start with 072 or 073" };
    return { ok: true, value: `+250${local}` };
  }
  if (method === "SBP_PHONE") {
    const local = digits.startsWith("7") || digits.startsWith("8") ? digits.slice(1) : digits;
    if (!/^9\d{9}$/.test(local)) return { ok: false, error: "Enter a Russian mobile number like +7 999 123-45-67" };
    return { ok: true, value: `+7${local}` };
  }
  if (method === "CARD") {
    if (!/^\d{16,19}$/.test(digits) || !luhnOk(digits)) return { ok: false, error: "Enter a valid 16–19 digit card number" };
    return { ok: true, value: digits };
  }
  if (method === "BANK_ACCOUNT") {
    const acc = v.replace(/\s+/g, "").toUpperCase();
    if (!/^[A-Z0-9-]{5,34}$/.test(acc)) return { ok: false, error: "Enter a valid account number" };
    return { ok: true, value: acc };
  }
  return { ok: false, error: "Unsupported method" };
}

export function maskAccount(v: string) {
  if (v.length <= 6) return v;
  return `${v.slice(0, 4)} •••• ${v.slice(-4)}`;
}
