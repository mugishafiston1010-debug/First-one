"use server";
import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { telegramApi } from "@/lib/notify/channels";
import { appUrl } from "@/lib/notify";
import { audit } from "@/lib/audit";

/** Make a one-time code and send the customer to the bot with it. */
export async function connectTelegram() {
  const user = await requireUser();
  const bot = process.env.TELEGRAM_BOT_USERNAME;
  if (!bot) redirect("/app");
  const token = randomBytes(18).toString("base64url");
  await db.user.update({ where: { id: user.id }, data: { telegramLinkToken: token } });
  redirect(`https://t.me/${bot}?start=${token}`);
}

export async function disconnectTelegram() {
  const user = await requireUser();
  await db.user.update({ where: { id: user.id }, data: { telegramChatId: null, telegramLinkToken: null } });
  revalidatePath("/app");
}

export type SetupState = { ok?: string; error?: string } | undefined;

/** Tell Telegram where to send bot messages (run once after going online). */
export async function registerTelegramWebhook(): Promise<SetupState> {
  const admin = await requireAdmin();
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return { error: "Set TELEGRAM_WEBHOOK_SECRET first" };
  if (!appUrl().startsWith("https://")) return { error: "APP_URL must be your public https address" };
  try {
    await telegramApi("setWebhook", { url: `${appUrl()}/api/telegram/webhook`, secret_token: secret, allowed_updates: ["message"] });
  } catch (e) {
    return { error: (e as Error).message };
  }
  await audit(admin.id, "telegram.webhook");
  return { ok: "Telegram bot connected" };
}

export async function sendTestToTeam(): Promise<SetupState> {
  await requireAdmin();
  const chat = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!chat) return { error: "Set TELEGRAM_ADMIN_CHAT_ID first" };
  try {
    await telegramApi("sendMessage", { chat_id: chat, text: "✅ Inzira test message: team notifications work." });
  } catch (e) {
    return { error: (e as Error).message };
  }
  return { ok: "Sent" };
}
