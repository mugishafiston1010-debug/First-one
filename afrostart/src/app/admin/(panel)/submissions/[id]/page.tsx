import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { AdminHeader, Panel, Pill } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { approveSubmission, deleteSubmission, rejectSubmission } from "@/app/actions/admin";
import { businessCategoryLabel } from "@/lib/labels";
import { fmtDate } from "@/components/Dates";
import { safeHttpUrl } from "@/lib/safe-url";

export default async function SubmissionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const s = await db.businessSubmission.findUnique({ where: { id }, include: { city: true, reviewedBy: { select: { name: true } }, business: { select: { id: true, name: true } } } });
  if (!s) notFound();
  const site = safeHttpUrl(s.website);
  const rows: [string, React.ReactNode][] = [
    ["Category", businessCategoryLabel(s.category)],
    ["City", s.city?.name ?? `${s.cityOther} (not in our city list)`],
    ["Address", s.address ?? "—"],
    ["Website / social", site ? <a href={site} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-600 underline">{site}</a> : "—"],
    ["Contact name", s.contactName],
    ["Contact email", <a key="e" href={`mailto:${s.contactEmail}`} className="text-brand-600 underline">{s.contactEmail}</a>],
    ["Contact phone", s.contactPhone ?? "—"],
    ["Received", fmtDate(s.createdAt)],
  ];
  return (
    <>
      <AdminHeader title={s.name} sub="Business submission" action={<Pill tone={s.status === "PENDING" ? "amber" : s.status === "APPROVED" ? "green" : "gray"}>{s.status.toLowerCase()}</Pill>} />
      {sp.error === "no-city" && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">This submission is for a city that is not in the list yet. <Link href="/admin/cities/new" className="underline">Create the city</Link> first, then add the listing manually from Businesses → New listing.</p>}
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Panel>
          <dl className="grid gap-4 sm:grid-cols-2">
            {rows.map(([k, v]) => <div key={k}><dt className="text-xs font-semibold uppercase tracking-wide text-muted">{k}</dt><dd className="mt-1 text-sm text-ink">{v}</dd></div>)}
          </dl>
          <div className="mt-6 border-t border-line pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Description</p>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink">{s.description}</p>
          </div>
        </Panel>
        <Panel title="Review">
          {s.status === "PENDING" ? (
            <div className="space-y-5">
              <div>
                <p className="mb-3 text-sm text-muted">Before approving, check the business is real: call or message the contact, look at its website or social pages.</p>
                <ConfirmButton action={approveSubmission.bind(null, s.id)} confirm="Create a draft listing from this submission? It will not be public until you publish it." className="btn-primary w-full">Approve → create draft listing</ConfirmButton>
              </div>
              <form action={rejectSubmission.bind(null, s.id)} className="space-y-3 border-t border-line pt-5">
                <label htmlFor="note" className="label">Reason for rejection (internal)</label>
                <textarea id="note" name="note" rows={3} className="input" placeholder="e.g. could not confirm the business exists" />
                <button className="btn-ghost w-full">Reject</button>
              </form>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <p>{s.status === "APPROVED" ? "Approved" : "Rejected"} by {s.reviewedBy?.name ?? "—"} {s.reviewedAt && `on ${fmtDate(s.reviewedAt)}`}.</p>
              {s.reviewNote && <p className="text-muted">Note: {s.reviewNote}</p>}
              {s.business && <Link href={`/admin/businesses/${s.business.id}`} className="btn-primary w-full">Open listing</Link>}
              {s.status === "REJECTED" && <ConfirmButton action={deleteSubmission.bind(null, s.id)} confirm="Delete this submission and its contact data?" className="btn-danger btn-sm w-full">Delete submission data</ConfirmButton>}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
