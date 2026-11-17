import "server-only";
import { cache } from "react";
import { db } from "./db";

export type Settings = {
  supportWhatsapp: string;
  supportTelegram: string;
  acceptingOrders: boolean;
  noticeEn: string;
  noticeRu: string;
};

/** Business settings, read once per request. Environment values are only a fallback. */
export const getSettings = cache(async (): Promise<Settings> => {
  const s = await db.appSetting.findUnique({ where: { id: "main" } });
  return {
    supportWhatsapp: s?.supportWhatsapp || (process.env.NEXT_PUBLIC_WHATSAPP ?? "").replace(/\D/g, ""),
    supportTelegram: s?.supportTelegram || (process.env.NEXT_PUBLIC_TELEGRAM ?? "").replace(/^@/, ""),
    acceptingOrders: s?.acceptingOrders ?? true,
    noticeEn: s?.noticeEn ?? "",
    noticeRu: s?.noticeRu ?? "",
  };
});

/** WhatsApp chat link, or null when no number is set (then the button is hidden). */
export function whatsappUrl(s: Settings, text?: string): string | null {
  if (!s.supportWhatsapp) return null;
  return `https://wa.me/${s.supportWhatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function telegramUrl(s: Settings): string | null {
  return s.supportTelegram ? `https://t.me/${s.supportTelegram}` : null;
}
