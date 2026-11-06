import "server-only";
import { after } from "next/server";
import { db } from "../db";
import { customerMessage, type NotifyEvent } from "./messages";
import { sendTelegram, sendWhatsApp, telegramEnabled, whatsappEnabled } from "./channels";

/** Public address of the site. On Vercel it is found automatically if APP_URL is not set. */
export function appUrl() {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return (process.env.APP_URL || (vercel ? `https://${vercel}` : "http://localhost:3000")).replace(/\/$/, "");
}

/** Send to the customer on every channel they have. Failures are logged, never thrown. */
async function deliverToCustomer(orderId: string, event: NotifyEvent, note?: string | null) {
  const o = await db.order.findUnique({ where: { id: orderId }, include: { user: true } });
  if (!o) return;
  const text = customerMessage(
    event,
    {
      ref: o.ref,
      totalToPay: o.totalToPay.toString(),
      fromCurrency: o.fromCurrency,
      receiveAmount: o.receiveAmount.toString(),
      toCurrency: o.toCurrency,
      recipientName: o.recipientName,
      payBy: o.payBy,
      note,
    },
    o.user.locale,
    `${appUrl()}/app/orders/${o.ref}`,
  );
  const jobs: Promise<unknown>[] = [];
  if (o.user.telegramChatId && telegramEnabled()) jobs.push(sendTelegram(o.user.telegramChatId, text));
  // WhatsApp only for the important moments, to keep template costs low.
  if (o.user.phone && whatsappEnabled() && (event === "DELIVERED" || event === "RECEIPT_REJECTED")) jobs.push(sendWhatsApp(o.user.phone, text));
  for (const r of await Promise.allSettled(jobs)) if (r.status === "rejected") console.error("notify customer failed:", r.reason);
}

async function deliverToTeam(text: string) {
  const chat = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!chat || !telegramEnabled()) return;
  try {
    await sendTelegram(chat, text);
  } catch (e) {
    console.error("notify team failed:", e);
  }
}

/** Run after the response is sent, so a slow Telegram never slows the page. */
function later(fn: () => Promise<unknown>) {
  try {
    after(fn);
  } catch {
    // Outside a request (scripts, tests): run now in the background.
    void fn().catch((e) => console.error(e));
  }
}

export function notifyCustomer(orderId: string, event: NotifyEvent, note?: string | null) {
  later(() => deliverToCustomer(orderId, event, note));
}

export function notifyTeam(text: string) {
  later(() => deliverToTeam(text));
}

/** Schedule any job after the response (used for the AI receipt check). */
export function runLater(fn: () => Promise<unknown>) {
  later(fn);
}
