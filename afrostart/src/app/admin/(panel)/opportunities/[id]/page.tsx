import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { AdminHeader, Pill, Saved } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { closeOpportunity, deleteOpportunity } from "@/app/actions/admin";
import { effectiveStatus } from "@/lib/opportunity-status";
import { OpportunityForm } from "../OpportunityForm";

export default async function EditOpportunity({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const o = await db.opportunity.findUnique({ where: { id } });
  if (!o) notFound();
  const s = effectiveStatus(o);
  return (
    <>
      <AdminHeader
        title={o.title}
        sub="Opportunity"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={s === "OPEN" ? "green" : s === "EXPIRED" ? "red" : s === "DRAFT" ? "amber" : "gray"}>{s.toLowerCase()}</Pill>
            {o.status !== "DRAFT" && <Link href={`/opportunities/${o.slug}`} target="_blank" className="btn-ghost btn-sm">View <ExternalLink className="h-3.5 w-3.5" /></Link>}
            {o.status === "OPEN" && <ConfirmButton action={closeOpportunity.bind(null, o.id)} confirm="Mark this opportunity as closed?">Mark closed</ConfirmButton>}
            <ConfirmButton action={deleteOpportunity.bind(null, o.id)} confirm="Delete permanently?" className="btn-danger btn-sm">Delete</ConfirmButton>
          </div>
        }
      />
      <Saved show={!!sp.saved} />
      <OpportunityForm key={o.updatedAt.toISOString()} o={o} />
    </>
  );
}
