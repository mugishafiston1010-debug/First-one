import "server-only";
import { addMinutes } from "date-fns";
import type { Corridor } from "@prisma/client";
import { db } from "../db";
import { priceTransfer, type Price } from "../money";
import { QUOTE_TTL_MIN } from "../limits";

export async function enabledCorridors() {
  return db.corridor.findMany({ where: { enabled: true }, orderBy: [{ fromCurrency: "asc" }, { toCurrency: "asc" }] });
}

export function settingsOf(c: Corridor) {
  return {
    fromCurrency: c.fromCurrency,
    toCurrency: c.toCurrency,
    midRate: c.midRate.toString(),
    marginBps: c.marginBps,
    fixedFee: c.fixedFee.toString(),
    percentFeeBps: c.percentFeeBps,
    minSend: c.minSend.toString(),
    maxSend: c.maxSend.toString(),
  };
}

export async function findCorridor(from: string, to: string) {
  return db.corridor.findUnique({ where: { fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to } } });
}

/** Price and save a locked quote for a signed-in user. */
export async function createQuote(userId: string, corridor: Corridor, input: { send?: string; receive?: string }) {
  const p: Price = priceTransfer(settingsOf(corridor), input);
  return db.quote.create({
    data: {
      userId,
      corridorId: corridor.id,
      sendAmount: p.sendAmount.toString(),
      fee: p.fee.toString(),
      totalToPay: p.totalToPay.toString(),
      midRate: p.midRate.toString(),
      customerRate: p.customerRate.toString(),
      receiveAmount: p.receiveAmount.toString(),
      expiresAt: addMinutes(new Date(), QUOTE_TTL_MIN),
    },
    include: { corridor: true },
  });
}
