import Link from "next/link";
import { db } from "@/lib/db";
import { AdminHeader, NewButton, Pill, Table } from "@/components/admin/ui";
import { fmtDate } from "@/components/Dates";

export default async function AdminCities() {
  const cities = await db.city.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { universities: true, resources: true, businesses: true, guides: true } } } });
  return (
    <>
      <AdminHeader title="Cities" sub="City pages, universities and local resources." action={<NewButton href="/admin/cities/new">New city</NewButton>} />
      <Table head={["City", "Status", "Universities", "Resources", "Businesses", "Guides", "Verified"]} empty={!cities.length}>
        {cities.map((c) => (
          <tr key={c.id} className="hover:bg-canvas">
            <td className="px-4 py-3"><Link href={`/admin/cities/${c.id}`} className="font-semibold text-ink hover:text-brand-600">{c.name}</Link><span className="block text-xs text-muted">{c.region}</span></td>
            <td className="px-4 py-3">{c.published ? <Pill tone="green">Published</Pill> : <Pill tone="gray">Hidden</Pill>}</td>
            <td className="px-4 py-3">{c._count.universities}</td>
            <td className="px-4 py-3">{c._count.resources}</td>
            <td className="px-4 py-3">{c._count.businesses}</td>
            <td className="px-4 py-3">{c._count.guides}</td>
            <td className="px-4 py-3">{c.lastVerifiedAt ? fmtDate(c.lastVerifiedAt) : <Pill tone="amber">No date</Pill>}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
