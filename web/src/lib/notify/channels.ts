import "server-only";

export function telegramEnabled() {
  return !!process.env.TELEGRAM_BOT_TOKEN;
}

export function whatsappEnabled() {
  return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export async function telegramApi(method: string, body: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  const base = process.env.TELEGRAM_API_BASE || "https://api.telegram.org";
  const r = await fetch(`${base}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await r.json().catch(() => null)) as { ok?: boolean; description?: string; result?: unknown } | null;
  if (!json?.ok) throw new Error(`Telegram ${method} failed: ${json?.description ?? r.status}`);
  return json.result;
}

export async function sendTelegram(chatId: string, text: string) {
  return telegramApi("sendMessage", { chat_id: chatId, text, disable_web_page_preview: true });
}

/**
 * WhatsApp Cloud API. Business-started messages must use a template approved by Meta.
 * The template needs one text variable in its body: {{1}} = our message.
 */
export async function sendWhatsApp(phone: string, text: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return null;
  const to = phone.replace(/\D/g, "");
  const r = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: process.env.WHATSAPP_TEMPLATE || "order_update",
        language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "en" },
        components: [{ type: "body", parameters: [{ type: "text", text: text.replace(/\n/g, " ").slice(0, 1000) }] }],
      },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) throw new Error(`WhatsApp send failed: ${r.status} ${await r.text().catch(() => "")}`);
  return true;
}
