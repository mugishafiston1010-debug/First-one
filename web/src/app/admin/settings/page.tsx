import { aiEnabled, AI_MODEL } from "@/lib/services/receipt-ai";
import { telegramEnabled, whatsappEnabled } from "@/lib/notify/channels";
import { storageMode } from "@/lib/storage";
import { appUrl } from "@/lib/notify";
import { registerTelegramWebhook, sendTestToTeam } from "@/app/actions/telegram";
import { ActionForm } from "@/components/ActionForm";

function Row({ ok, title, detail }: { ok: boolean; title: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <span className={`mt-0.5 text-lg ${ok ? "text-brand" : "text-muted"}`}>{ok ? "●" : "○"}</span>
      <div>
        <div className="font-semibold">{title} — {ok ? "on" : "off"}</div>
        <div className="text-sm text-muted">{detail}</div>
      </div>
    </div>
  );
}

export default function Settings() {
  const tg = telegramEnabled();
  return (
    <div className="space-y-4">
      <h1 className="h1">Settings</h1>
      <p className="text-sm text-muted">These are switched on with environment variables on your hosting (see the README). Nothing secret is shown here.</p>
      <div className="divide-y divide-line rounded-2xl border border-line bg-white">
        <Row ok={appUrl().startsWith("https://")} title="Public address" detail={`APP_URL = ${appUrl()}`} />
        <Row ok={storageMode() === "s3"} title="Private file storage" detail={storageMode() === "s3" ? "Receipts and passports go to your S3 bucket." : "Files are on this server's disk. Fine for testing, not for real hosting."} />
        <Row ok={aiEnabled()} title="AI receipt check" detail={aiEnabled() ? `Model ${AI_MODEL}. Each receipt is read and compared with its order.` : "Add ANTHROPIC_API_KEY. Until then receipts are checked by hand only (duplicate files are still caught)."} />
        <Row ok={tg} title="Telegram bot" detail={tg ? `Bot @${process.env.TELEGRAM_BOT_USERNAME ?? "?"}. Customers connect from their home page.` : "Add TELEGRAM_BOT_TOKEN and TELEGRAM_BOT_USERNAME."} />
        <Row ok={tg && !!process.env.TELEGRAM_ADMIN_CHAT_ID} title="Team alerts in Telegram" detail="New orders, receipts with the AI verdict, identity checks. Needs TELEGRAM_ADMIN_CHAT_ID." />
        <Row ok={whatsappEnabled()} title="WhatsApp messages" detail="Needs a Meta-approved WhatsApp Business account: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID and an approved template." />
      </div>
      {tg && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="card">
            <h2 className="mb-1 font-bold">1. Connect the bot</h2>
            <p className="mb-3 text-sm text-muted">Run once after the site is online, and again if the address changes.</p>
            <ActionForm action={registerTelegramWebhook} submit="Connect Telegram bot">{null}</ActionForm>
          </div>
          <div className="card">
            <h2 className="mb-1 font-bold">2. Test team alerts</h2>
            <p className="mb-3 text-sm text-muted">Sends a test message to your team chat.</p>
            <ActionForm action={sendTestToTeam} submit="Send test message">{null}</ActionForm>
          </div>
        </div>
      )}
    </div>
  );
}
