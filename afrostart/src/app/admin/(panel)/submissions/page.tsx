import Link from "next/link";
import { db } from "@/lib/db";
import { AdminHeader, Pill, Table } from "@/components/admin/ui";
import { businessCategoryLabel } from "@/lib/labels";
import { fmtDate } from "@/components/Dates";

const TABS = [["pending", "Pending"], ["approved", "Approved"], ["rejected", "Rejected"]] as const;

export default async function Submissions({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = (TABS.find(([v]) => v === sp.status)?.[0] ?? "pending").toUpperCase() as "PENDING" | "APPROVED" | "REJECTED";
  const list = await db.businessSubmission.findMany({ where: { status }, include: { city: { select: { name: true } } }, orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" } });
  return (
    <>
      <AdminHeader title="Business submissions" sub="From the public “List your business” form. Nothing here is public until you approve and publish it." />
      <div className="mb-4 flex gap-2">
        {TABS.map(([v, l]) => <Link key={v} href={`/admin/submissions?status=${v}`} className={`rounded-full px-3 py-1.5 text-sm font-medium ${status.toLowerCase() === v ? "bg-brand-600 text-white" : "bg-white ring-1 ring-line"}`}>{l}</Link>)}
      </div>
      <Table head={["Business", "Category", "City", "Contact", "Received", "Status"]} empty={!list.length}>
        {list.map((s) => (
          <tr key={s.id} className="hover:bg-canvas">
            <td className="px-4 py-3"><Link href={`/admin/submissions/${s.id}`} className="font-semibold text-ink hover:text-brand-600">{s.name}</Link></td>
            <td className="px-4 py-3 text-muted">{businessCategoryLabel(s.category)}</td>
            <td className="px-4 py-3 text-muted">{s.city?.name ?? <span>{s.cityOther} <Pill tone="amber">new city</Pill></span>}</td>
            <td className="px-4 py-3 text-muted">{s.contactName}</td>
            <td className="px-4 py-3 text-muted">{fmtDate(s.createdAt)}</td>
            <td className="px-4 py-3"><Pill tone={s.status === "PENDING" ? "amber" : s.status === "APPROVED" ? "green" : "gray"}>{s.status.toLowerCase()}</Pill></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
