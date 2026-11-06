import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getT, type TKey } from "@/lib/i18n";
import { removeRecipient } from "@/app/actions/customer";
import { wizardLabels } from "@/lib/wizard-labels";
import { AddRecipient } from "./AddRecipient";

export default async function RecipientsPage() {
  const user = await requireUser();
  const { t } = await getT();
  const list = await db.recipient.findMany({ where: { userId: user.id, archived: false }, orderBy: { createdAt: "desc" } });
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="h1">{t("rcp.title")}</h1>
      <div className="divide-y divide-line rounded-2xl border border-line bg-white">
        {list.length === 0 && <p className="p-5 text-muted">{t("rcp.empty")}</p>}
        {list.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="min-w-0">
              <div className="font-semibold">{r.fullName}</div>
              <div className="text-sm text-muted">
                {r.country} · {t(`method.${r.method}` as TKey)} · {r.provider}
              </div>
              <div className="num text-sm">{r.accountNumber}</div>
            </div>
            <form action={removeRecipient}>
              <input type="hidden" name="id" value={r.id} />
              <button className="text-sm font-semibold text-danger">{t("rcp.remove")}</button>
            </form>
          </div>
        ))}
      </div>
      <AddRecipient labels={wizardLabels(t)} title={t("rcp.add")} />
    </div>
  );
}
