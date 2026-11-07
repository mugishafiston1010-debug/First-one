import Link from "next/link";
import { db } from "@/lib/db";
import { AdminHeader, NewButton, Pill, Table } from "@/components/admin/ui";
import { businessCategoryLabel } from "@/lib/labels";
import { fmtDate } from "@/components/Dates";

export default async function AdminBusinesses({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string }> }) {
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 100);
  const now = new Date();
  const list = await db.business.findMany({
    where: {
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      ...(sp.filter === "unpublished" ? { published: false } : sp.filter === "sponsored" ? { placements: { some: { startsAt: { lte: now }, endsAt: { gte: now } } } } : {}),
    },
    include: { city: { select: { name: true } }, placements: { where: { startsAt: { lte: now }, endsAt: { gte: now } }, select: { id: true } } },
    orderBy: { updatedAt: "desc" },
  });
  const tabs = [["", "All"], ["unpublished", "Not published"], ["sponsored", "Sponsored now"]];
  return (
    <>
      <AdminHeader title="Businesses" sub="Directory listings. Publishing, verification and sponsorship are separate decisions." action={<NewButton href="/admin/businesses/new">New listing</NewButton>} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tabs.map(([v, l]) => <Link key={v} href={v ? `/admin/businesses?filter=${v}` : "/admin/businesses"} className={`rounded-full px-3 py-1.5 text-sm font-medium ${(sp.filter ?? "") === v ? "bg-brand-600 text-white" : "bg-white ring-1 ring-line"}`}>{l}</Link>)}
        <form className="ml-auto"><input name="q" defaultValue={q} placeholder="Search names" className="input py-2" /></form>
      </div>
      <Table head={["Business", "Category", "City", "Status", "Flags", "Updated"]} empty={!list.length}>
        {list.map((b) => (
          <tr key={b.id} className="hover:bg-canvas">
            <td className="px-4 py-3"><Link href={`/admin/businesses/${b.id}`} className="font-semibold text-ink hover:text-brand-600">{b.name}</Link></td>
            <td className="px-4 py-3 text-muted">{businessCategoryLabel(b.category)}</td>
            <td className="px-4 py-3 text-muted">{b.city.name}</td>
            <td className="px-4 py-3">{b.published ? <Pill tone="green">Published</Pill> : <Pill tone="gray">Hidden</Pill>}</td>
            <td className="space-x-1 px-4 py-3">{b.verified && <Pill tone="green">Verified</Pill>}{b.featured && <Pill tone="blue">Pick</Pill>}{b.placements.length > 0 && <Pill tone="amber">Sponsored</Pill>}</td>
            <td className="px-4 py-3 text-muted">{fmtDate(b.updatedAt)}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
