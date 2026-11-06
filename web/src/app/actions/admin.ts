"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { transition } from "@/lib/services/orders";
import type { OrderAction } from "@/lib/order-state";
import { TransitionError } from "@/lib/order-state";
import { saveUpload, UploadError } from "@/lib/storage";
import { audit } from "@/lib/audit";

export type AdminState = { error?: string; ok?: string } | undefined;

const ACTIONS: OrderAction[] = ["CONFIRM_PAYMENT", "REJECT_RECEIPT", "MARK_DELIVERED", "CANCEL", "REFUND"];

export async function adminOrderAction(_: AdminState, form: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const orderId = String(form.get("orderId"));
  const action = String(form.get("action")) as OrderAction;
  const note = String(form.get("note") ?? "").trim() || undefined;
  if (!ACTIONS.includes(action)) return { error: "Unknown action" };
  if ((action === "REJECT_RECEIPT" || action === "CANCEL" || action === "REFUND") && !note) return { error: "Write a reason" };

  try {
    let data = {};
    if (action === "MARK_DELIVERED") {
      const ref = String(form.get("payoutReference") ?? "").trim();
      const file = form.get("proof") as File | null;
      if (!ref && (!file || file.size === 0)) return { error: "Add the payout transaction ID or a proof screenshot" };
      const proof = file && file.size > 0 ? await saveUpload(admin.id, "payout_proof", file) : null;
      data = { payoutReference: ref || null, payoutProofFileId: proof?.id ?? null };
    }
    if (action === "CANCEL" || action === "REFUND") data = { cancelReason: note };
    await transition(orderId, action, { id: admin.id, kind: "admin" }, { note, data });
    await audit(admin.id, `order.${action.toLowerCase()}`, orderId, note ? { note } : undefined);
  } catch (e) {
    if (e instanceof TransitionError || e instanceof UploadError) return { error: e.message };
    console.error(e);
    return { error: "Failed. Reload and try again." };
  }
  revalidatePath("/admin", "layout");
  return { ok: "Done" };
}

const corridorSchema = z.object({
  id: z.string(),
  midRate: z.coerce.number().positive(),
  marginBps: z.coerce.number().int().min(0).max(2000),
  fixedFee: z.coerce.number().min(0),
  percentFeeBps: z.coerce.number().int().min(0).max(2000),
  minSend: z.coerce.number().positive(),
  maxSend: z.coerce.number().positive(),
  enabled: z.preprocess((v) => v === "on", z.boolean()),
});

export async function updateCorridor(_: AdminState, form: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const p = corridorSchema.safeParse({ ...Object.fromEntries(form), enabled: form.get("enabled") });
  if (!p.success) return { error: "Check the values: " + p.error.issues.map((i) => i.path.join(".")).join(", ") };
  if (p.data.minSend >= p.data.maxSend) return { error: "Minimum must be below maximum" };
  const before = await db.corridor.findUniqueOrThrow({ where: { id: p.data.id } });
  // Guard against typos: a rate change over 10% needs the "confirm big change" box.
  const change = Math.abs(p.data.midRate - Number(before.midRate)) / Number(before.midRate);
  if (change > 0.1 && form.get("confirmBig") !== "on") return { error: `Rate changes by ${(change * 100).toFixed(1)}%. Tick "confirm big change" if this is right.` };
  const { id, ...rest } = p.data;
  await db.corridor.update({
    where: { id },
    data: {
      ...rest,
      midRate: String(rest.midRate),
      fixedFee: String(rest.fixedFee),
      minSend: String(rest.minSend),
      maxSend: String(rest.maxSend),
      ...(Number(before.midRate) !== rest.midRate ? { rateUpdatedAt: new Date() } : {}),
    },
  });
  await audit(admin.id, "corridor.update", id, { before: { midRate: before.midRate.toString(), marginBps: before.marginBps }, after: { midRate: rest.midRate, marginBps: rest.marginBps } });
  revalidatePath("/", "layout");
  return { ok: "Saved" };
}

const payInSchema = z.object({
  label: z.string().trim().min(2).max(60),
  currency: z.enum(["RUB", "RWF"]),
  method: z.enum(["MOBILE_MONEY", "BANK_ACCOUNT", "CARD", "SBP_PHONE"]),
  provider: z.string().trim().min(2).max(60),
  holderName: z.string().trim().min(2).max(80),
  accountNumber: z.string().trim().min(4).max(40),
  dailyLimit: z.coerce.number().positive(),
  perOrderLimit: z.coerce.number().positive(),
});

export async function createPayIn(_: AdminState, form: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const p = payInSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: "Check the values: " + p.error.issues.map((i) => i.path.join(".")).join(", ") };
  const a = await db.payInAccount.create({
    data: { ...p.data, dailyLimit: String(p.data.dailyLimit), perOrderLimit: String(p.data.perOrderLimit) },
  });
  await audit(admin.id, "payin.create", a.id);
  revalidatePath("/admin/payin");
  return { ok: "Added" };
}

export async function togglePayIn(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id"));
  const a = await db.payInAccount.findUniqueOrThrow({ where: { id } });
  await db.payInAccount.update({ where: { id }, data: { active: !a.active } });
  await audit(admin.id, a.active ? "payin.disable" : "payin.enable", id);
  revalidatePath("/admin/payin");
}

export async function reviewKyc(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id"));
  const decision = form.get("decision") === "approve" ? "APPROVED" : "REJECTED";
  const note = String(form.get("note") ?? "").trim() || null;
  const sub = await db.kycSubmission.findUniqueOrThrow({ where: { id } });
  if (sub.status !== "PENDING") return;
  await db.$transaction([
    db.kycSubmission.update({ where: { id }, data: { status: decision, reviewerNote: note, reviewedAt: new Date() } }),
    db.user.update({ where: { id: sub.userId }, data: { kycStatus: decision } }),
  ]);
  await audit(admin.id, `kyc.${decision.toLowerCase()}`, sub.userId, note ? { note } : undefined);
  revalidatePath("/admin/kyc");
}

export async function toggleSuspend(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id"));
  if (id === admin.id) return;
  const u = await db.user.findUniqueOrThrow({ where: { id } });
  await db.user.update({ where: { id }, data: { suspended: !u.suspended } });
  await audit(admin.id, u.suspended ? "user.unsuspend" : "user.suspend", id);
  revalidatePath("/admin/users");
}
