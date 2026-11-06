"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { differenceInYears } from "date-fns";
import type { PayMethod } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { normaliseAccount, PAYOUT_OPTIONS } from "@/lib/providers";
import { createQuote, findCorridor } from "@/lib/services/pricing";
import { createOrder, OrderError, transition } from "@/lib/services/orders";
import { PriceError, formatMoney } from "@/lib/money";
import { saveUpload, UploadError } from "@/lib/storage";
import { TransitionError } from "@/lib/order-state";
import { audit } from "@/lib/audit";
import { tooMany } from "@/lib/rate-limit";

const METHODS = ["MOBILE_MONEY", "BANK_ACCOUNT", "CARD", "SBP_PHONE"] as const;

// ---------- Recipients ----------

const recipientSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  currency: z.string().length(3),
  method: z.enum(METHODS),
  provider: z.string().trim().min(2).max(60),
  accountNumber: z.string().trim().min(4).max(40),
});

export type RecipientResult =
  | { ok: true; recipient: { id: string; fullName: string; currency: string; method: PayMethod; provider: string; accountNumber: string } }
  | { ok: false; error: string };

export async function addRecipient(input: z.infer<typeof recipientSchema>): Promise<RecipientResult> {
  const user = await requireUser();
  const { t } = await getT();
  const parsed = recipientSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t("common.error") };
  const r = parsed.data;
  const providers = PAYOUT_OPTIONS[r.currency]?.methods[r.method];
  if (!providers?.includes(r.provider)) return { ok: false, error: t("common.error") };
  const acc = normaliseAccount(r.currency, r.method, r.provider, r.accountNumber);
  if (!acc.ok) return { ok: false, error: acc.error };
  const country = PAYOUT_OPTIONS[r.currency].country;
  const existing = await db.recipient.findFirst({
    where: { userId: user.id, currency: r.currency, method: r.method, accountNumber: acc.value, archived: false },
  });
  const recipient =
    existing ??
    (await db.recipient.create({ data: { ...r, accountNumber: acc.value, country, userId: user.id } }));
  revalidatePath("/app/recipients");
  return { ok: true, recipient };
}

export async function removeRecipient(form: FormData) {
  const user = await requireUser();
  const id = String(form.get("id"));
  await db.recipient.updateMany({ where: { id, userId: user.id }, data: { archived: true } });
  revalidatePath("/app/recipients");
}

// ---------- Quote & order ----------

export type QuoteResult =
  | { ok: true; quote: { id: string; sendAmount: string; fee: string; totalToPay: string; customerRate: string; midRate: string; receiveAmount: string; from: string; to: string; expiresAt: string } }
  | { ok: false; error: string };

export async function getQuote(input: { from: string; to: string; send?: string; receive?: string }): Promise<QuoteResult> {
  const user = await requireUser();
  const { t, locale } = await getT();
  const corridor = await findCorridor(input.from, input.to);
  if (!corridor?.enabled) return { ok: false, error: t("calc.unavailable") };
  try {
    const q = await createQuote(user.id, corridor, { send: input.send, receive: input.receive });
    return {
      ok: true,
      quote: {
        id: q.id,
        sendAmount: q.sendAmount.toString(),
        fee: q.fee.toString(),
        totalToPay: q.totalToPay.toString(),
        customerRate: q.customerRate.toString(),
        midRate: q.midRate.toString(),
        receiveAmount: q.receiveAmount.toString(),
        from: corridor.fromCurrency,
        to: corridor.toCurrency,
        expiresAt: q.expiresAt.toISOString(),
      },
    };
  } catch (e) {
    if (e instanceof PriceError && e.limit) {
      return { ok: false, error: `${t(e.code === "BELOW_MIN" ? "calc.min" : "calc.max")} ${formatMoney(e.limit, corridor.fromCurrency, locale)}` };
    }
    return { ok: false, error: t("calc.invalid") };
  }
}

export async function placeOrder(quoteId: string, recipientId: string): Promise<{ ok: false; error: string } | never> {
  const user = await requireUser();
  const { t } = await getT();
  let ref: string;
  try {
    const order = await createOrder(user.id, quoteId, recipientId);
    ref = order.ref;
    await audit(user.id, "order.create", order.id);
  } catch (e) {
    if (e instanceof OrderError) {
      const map: Partial<Record<OrderError["code"], Parameters<typeof t>[0]>> = {
        QUOTE_EXPIRED: "send.quoteExpired",
        LIMIT: "send.limitReached",
        TOO_MANY_OPEN: "send.tooManyOpen",
        NO_PAYIN: "send.noAccount",
      };
      return { ok: false, error: t(map[e.code] ?? "common.error") };
    }
    console.error("placeOrder failed", e);
    return { ok: false, error: t("common.error") };
  }
  redirect(`/app/orders/${ref}`);
}

export type ActionState = { error?: string; ok?: boolean } | undefined;

export async function uploadReceipt(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const { t } = await getT();
  if (tooMany(`receipt:${user.id}`, 20, 60 * 60_000)) return { error: t("auth.tooMany") };
  const ref = String(form.get("ref"));
  const order = await db.order.findFirst({ where: { ref, userId: user.id } });
  if (!order) return { error: t("common.error") };
  try {
    const file = await saveUpload(user.id, "receipt", form.get("file") as File);
    await transition(order.id, "SUBMIT_RECEIPT", { id: user.id, kind: "customer" }, { data: { receiptFileId: file.id }, note: "Receipt uploaded" });
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    if (e instanceof TransitionError) return { error: t("order.expired") };
    console.error(e);
    return { error: t("common.error") };
  }
  revalidatePath(`/app/orders/${ref}`);
  return { ok: true };
}

export async function cancelOrder(form: FormData) {
  const user = await requireUser();
  const ref = String(form.get("ref"));
  const order = await db.order.findFirst({ where: { ref, userId: user.id } });
  if (order) {
    try {
      await transition(order.id, "CANCEL", { id: user.id, kind: "customer" }, { note: "Cancelled by customer" });
    } catch (e) {
      if (!(e instanceof TransitionError)) throw e;
    }
  }
  revalidatePath(`/app/orders/${ref}`);
}

// ---------- Identity check ----------

const kycSchema = z.object({
  dateOfBirth: z.coerce.date(),
  passportNo: z.string().trim().min(5).max(20),
  nationality: z.string().trim().min(2).max(60),
});

export async function submitKyc(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const { t } = await getT();
  if (user.kycStatus === "PENDING" || user.kycStatus === "APPROVED") return { ok: true };
  const parsed = kycSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: t("common.error") };
  if (differenceInYears(new Date(), parsed.data.dateOfBirth) < 18) return { error: t("kyc.underAge") };
  try {
    const passport = await saveUpload(user.id, "kyc", form.get("passport") as File);
    const selfie = await saveUpload(user.id, "kyc", form.get("selfie") as File);
    await db.$transaction([
      db.kycSubmission.create({
        data: { ...parsed.data, userId: user.id, passportFile: passport.id, selfieFile: selfie.id },
      }),
      db.user.update({ where: { id: user.id }, data: { kycStatus: "PENDING" } }),
    ]);
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }
  await audit(user.id, "kyc.submit");
  revalidatePath("/app");
  return { ok: true };
}
