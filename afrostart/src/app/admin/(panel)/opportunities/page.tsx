import Link from "next/link";
import { db } from "@/lib/db";
import { AdminHeader, NewButton, Pill, Table } from "@/components/admin/ui";
import { effectiveStatus } from "@/lib/opportunity-status";
import { opportunityTypeLabel } from "@/lib/labels";
import { fmtDate } from "@/components/Dates";

const TONE = { OPEN: "green", EXPIRED: "red", CLOSED: "gray", DRAFT: "amber" } as const;

export default async function AdminOpportunities() {
  const list = await db.opportunity.findMany({ orderBy: [{ updatedAt: "desc" }] });
  return (
    <>
      <AdminHeader title="Opportunities" sub="Scholarships, admissions, competitions and programmes. Expired is calculated from the deadline." action={<NewButton href="/admin/opportunities/new">New opportunity</NewButton>} />
      <Table head={["Title", "Type", "Deadline", "Status", "Verified"]} empty={!list.length}>
        {list.map((o) => {
          const s = effectiveStatus(o);
          return (
            <tr key={o.id} className="hover:bg-canvas">
              <td className="px-4 py-3"><Link href={`/admin/opportunities/${o.id}`} className="font-semibold text-ink hover:text-brand-600">{o.title}</Link></td>
              <td className="px-4 py-3 text-muted">{opportunityTypeLabel(o.type)}</td>
              <td className="px-4 py-3 text-muted">{o.deadline ? fmtDate(o.deadline) : "—"}</td>
              <td className="px-4 py-3"><Pill tone={TONE[s]}>{s.toLowerCase()}</Pill></td>
              <td className="px-4 py-3">{o.lastVerifiedAt ? fmtDate(o.lastVerifiedAt) : <Pill tone="amber">No date</Pill>}</td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
