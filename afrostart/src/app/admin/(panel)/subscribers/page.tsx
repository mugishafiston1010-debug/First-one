import { db } from "@/lib/db";
import { AdminHeader, Table } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { deleteSubscriber } from "@/app/actions/admin";
import { fmtDate } from "@/components/Dates";
import { SITE_URL } from "@/lib/site";

export default async function Subscribers() {
  const list = await db.subscriber.findMany({ orderBy: { consentedAt: "desc" }, take: 500 });
  const total = await db.subscriber.count();
  return (
    <>
      <AdminHeader title="Newsletter subscribers" sub={`${total} people agreed to receive updates. Include each person's unsubscribe link in every email.`} />
      <Table head={["Email", "Language", "Subscribed", "Unsubscribe link", ""]} empty={!list.length}>
        {list.map((s) => (
          <tr key={s.id}>
            <td className="px-4 py-3 font-medium text-ink">{s.email}</td>
            <td className="px-4 py-3 uppercase text-muted">{s.locale}</td>
            <td className="px-4 py-3 text-muted">{fmtDate(s.consentedAt)}</td>
            <td className="max-w-[260px] truncate px-4 py-3 font-mono text-xs text-muted">{SITE_URL}/unsubscribe?token={s.token}</td>
            <td className="px-4 py-3 text-right"><ConfirmButton action={deleteSubscriber.bind(null, s.id)} confirm={`Delete ${s.email}?`}>Delete</ConfirmButton></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
