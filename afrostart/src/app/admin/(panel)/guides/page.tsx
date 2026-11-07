import Link from "next/link";
import { db } from "@/lib/db";
import { AdminHeader, NewButton, Pill, Table } from "@/components/admin/ui";
import { fmtDate } from "@/components/Dates";
import { trustInfo } from "@/lib/labels";

export default async function AdminGuides({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string }> }) {
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 100);
  const guides = await db.guide.findMany({
    where: {
      ...(sp.filter === "drafts" ? { published: false } : sp.filter === "unverified" ? { lastVerifiedAt: null } : {}),
      ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
    },
    include: { category: true, city: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });
  const tabs = [["", "All"], ["drafts", "Drafts"], ["unverified", "Not verified"]];
  return (
    <>
      <AdminHeader title="Guides" sub="Create, edit, publish and unpublish resource guides." action={<NewButton href="/admin/guides/new">New guide</NewButton>} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tabs.map(([v, l]) => <Link key={v} href={v ? `/admin/guides?filter=${v}` : "/admin/guides"} className={`rounded-full px-3 py-1.5 text-sm font-medium ${(sp.filter ?? "") === v ? "bg-brand-600 text-white" : "bg-white ring-1 ring-line"}`}>{l}</Link>)}
        <form className="ml-auto"><input name="q" defaultValue={q} placeholder="Search titles" className="input py-2" /></form>
      </div>
      <Table head={["Title", "Category", "Lang", "Type", "Status", "Verified", "Updated"]} empty={!guides.length}>
        {guides.map((g) => (
          <tr key={g.id} className="hover:bg-canvas">
            <td className="px-4 py-3"><Link href={`/admin/guides/${g.id}`} className="font-semibold text-ink hover:text-brand-600">{g.title}</Link>{g.city && <span className="block text-xs text-muted">{g.city.name}</span>}</td>
            <td className="px-4 py-3 text-muted">{g.category.name}</td>
            <td className="px-4 py-3 uppercase text-muted">{g.locale}</td>
            <td className="px-4 py-3 text-muted">{trustInfo(g.trust).label}</td>
            <td className="px-4 py-3">{g.published ? <Pill tone="green">Published</Pill> : <Pill tone="gray">Draft</Pill>}</td>
            <td className="px-4 py-3">{g.lastVerifiedAt ? fmtDate(g.lastVerifiedAt) : <Pill tone="amber">No date</Pill>}</td>
            <td className="px-4 py-3 text-muted">{fmtDate(g.updatedAt)}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
