import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { enabledCorridors, settingsOf } from "@/lib/services/pricing";
import { wizardLabels } from "@/lib/wizard-labels";
import { SendWizard } from "./SendWizard";

export const metadata = { title: "Send money" };

export default async function SendPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const [{ t, locale }, corridors, recipients, sp] = await Promise.all([
    getT(),
    enabledCorridors(),
    db.recipient.findMany({ where: { userId: user.id, archived: false }, orderBy: { createdAt: "desc" } }),
    searchParams,
  ]);
  if (corridors.length === 0) return <p className="text-muted">{t("calc.unavailable")}</p>;
  return (
    <SendWizard
      corridors={corridors.map(settingsOf)}
      recipients={recipients.map(({ id, fullName, currency, method, provider, accountNumber }) => ({ id, fullName, currency, method, provider, accountNumber }))}
      labels={wizardLabels(t)}
      locale={locale}
      initial={{ from: sp.from, to: sp.to, send: sp.send, receive: sp.receive }}
    />
  );
}
