import { getSettings, telegramUrl, whatsappUrl } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function Suspended() {
  const s = await getSettings();
  const wa = whatsappUrl(s, "My account is on hold");
  const tg = telegramUrl(s);
  return (
    <div className="mx-auto max-w-md card space-y-3 text-center">
      <h1 className="h2">Account on hold</h1>
      <p className="text-muted">Your account is temporarily on hold. Please contact support to resolve it.</p>
      <div className="flex justify-center gap-2">
        {wa && <a className="btn-primary" href={wa}>WhatsApp support</a>}
        {tg && <a className="btn-ghost" href={tg}>Telegram support</a>}
      </div>
    </div>
  );
}
