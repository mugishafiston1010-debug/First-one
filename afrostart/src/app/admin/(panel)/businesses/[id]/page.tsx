import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { AdminHeader, Panel, Pill, Saved } from "@/components/admin/ui";
import { AdminForm, DateField, SelectField, TextField } from "@/components/admin/Form";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { addPlacement, deleteBusiness, deletePlacement } from "@/app/actions/admin";
import { isPlacementActive } from "@/lib/sponsorship";
import { fmtDate } from "@/components/Dates";
import { BusinessForm } from "../BusinessForm";

const SLOTS = [
  { value: "DIRECTORY_TOP", label: "Top of directory" },
  { value: "HOMEPAGE", label: "Homepage services" },
  { value: "CITY_PAGE", label: "Top of city page" },
];

export default async function EditBusiness({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; from?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const b = await db.business.findUnique({ where: { id }, include: { placements: { orderBy: { startsAt: "desc" } }, submission: true } });
  if (!b) notFound();
  return (
    <>
      <AdminHeader
        title={b.name}
        sub={`Listing · ${b.published ? "Published" : "Not published"}`}
        action={
          <div className="flex gap-2">
            {b.published && <Link href={`/services/${b.slug}`} target="_blank" className="btn-ghost btn-sm">View <ExternalLink className="h-3.5 w-3.5" /></Link>}
            <ConfirmButton action={deleteBusiness.bind(null, b.id)} confirm="Delete this listing permanently?" className="btn-danger btn-sm">Delete</ConfirmButton>
          </div>
        }
      />
      <Saved show={!!sp.saved} />
      {sp.from === "submission" && <p className="mb-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">Draft created from the submission. Check the details and contacts, add public contact info, then tick <strong>Published</strong>.</p>}
      {b.submission && <p className="mb-4 text-sm text-muted">From <Link href={`/admin/submissions/${b.submission.id}`} className="text-brand-600 underline">submission</Link> by {b.submission.contactName} ({b.submission.contactEmail}).</p>}
      <BusinessForm key={b.updatedAt.toISOString()} business={b} />

      <Panel title="Sponsored placements" className="mt-8">
        <p className="mb-4 text-sm text-muted">Record paid visibility here. No payment is processed by the site. While active, the listing shows a “Sponsored” label. Sponsorship never changes verification.</p>
        <ul className="mb-6 divide-y divide-line">
          {b.placements.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span>
                <span className="font-semibold text-ink">{SLOTS.find((s) => s.value === p.slot)?.label}</span> · {fmtDate(p.startsAt)} → {fmtDate(p.endsAt)} {isPlacementActive(p) ? <Pill tone="amber">Active</Pill> : <Pill tone="gray">Inactive</Pill>}
                {p.note && <span className="block text-xs text-muted">{p.note}</span>}
              </span>
              <ConfirmButton action={deletePlacement.bind(null, p.id)} confirm="Remove this placement?">Remove</ConfirmButton>
            </li>
          ))}
          {!b.placements.length && <li className="py-2 text-sm text-muted">No placements.</li>}
        </ul>
        <AdminForm action={addPlacement.bind(null, b.id)} submitLabel="Add placement" resetOnSuccess idPrefix="pl-">
          <div className="grid gap-4 sm:grid-cols-4">
            <SelectField name="slot" label="Position" options={SLOTS} />
            <DateField name="startsAt" label="Starts" required />
            <DateField name="endsAt" label="Ends" required />
            <TextField name="note" label="Note (internal)" placeholder="Deal reference" />
          </div>
        </AdminForm>
      </Panel>
    </>
  );
}
