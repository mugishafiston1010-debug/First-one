import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { sendTelegram } from "@/lib/notify/channels";
import { telegramWelcome } from "@/lib/notify/messages";
import { audit } from "@/lib/audit";

function secretOk(got: string | null) {
  const want = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!want || !got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

type Update = { message?: { chat?: { id: number; type: string }; text?: string } };

/** Telegram calls this for each message to the bot. We only handle "/start <link code>". */
export async function POST(req: Request) {
  if (!secretOk(req.headers.get("x-telegram-bot-api-secret-token"))) return new NextResponse("Forbidden", { status: 403 });
  const update = (await req.json().catch(() => ({}))) as Update;
  const chat = update.message?.chat;
  const text = update.message?.text?.trim() ?? "";
  if (!chat || chat.type !== "private") return NextResponse.json({ ok: true });
  const chatId = String(chat.id);

  const m = /^\/start(?:\s+([A-Za-z0-9_-]{16,64}))?$/.exec(text);
  try {
    if (m?.[1]) {
      const user = await db.user.findUnique({ where: { telegramLinkToken: m[1] } });
      if (user) {
        // One Telegram chat belongs to one account.
        await db.user.updateMany({ where: { telegramChatId: chatId, id: { not: user.id } }, data: { telegramChatId: null } });
        await db.user.update({ where: { id: user.id }, data: { telegramChatId: chatId, telegramLinkToken: null } });
        await audit(user.id, "telegram.link");
        await sendTelegram(chatId, telegramWelcome(user.locale, user.fullName.split(" ")[0]));
        return NextResponse.json({ ok: true });
      }
    }
    await sendTelegram(chatId, "Open your account on the website and press “Connect Telegram” to get updates here.\nОткройте свой аккаунт на сайте и нажмите «Подключить Telegram».");
  } catch (e) {
    console.error("telegram webhook", e);
  }
  return NextResponse.json({ ok: true });
}
