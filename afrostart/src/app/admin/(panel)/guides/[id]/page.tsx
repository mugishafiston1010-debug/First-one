import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { AdminHeader, Saved } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { deleteGuide, setGuidePublished } from "@/app/actions/admin";
import { GuideForm } from "../GuideForm";

export default async function EditGuide({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const guide = await db.guide.findUnique({ where: { id }, include: { sources: { orderBy: { sort: "asc" } } } });
  if (!guide) notFound();
  return (
    <>
      <AdminHeader
        title={guide.title}
        sub={`Guide · ${guide.published ? "Published" : "Draft"} · ${guide.locale.toUpperCase()}`}
        action={
          <div className="flex flex-wrap gap-2">
            {guide.published && <Link href={`/guides/${guide.slug}`} target="_blank" className="btn-ghost btn-sm">View <ExternalLink className="h-3.5 w-3.5" /></Link>}
            <ConfirmButton action={setGuidePublished.bind(null, guide.id, !guide.published)}>{guide.published ? "Unpublish" : "Publish"}</ConfirmButton>
            <ConfirmButton action={deleteGuide.bind(null, guide.id)} confirm="Delete this guide permanently?" className="btn-danger btn-sm">Delete</ConfirmButton>
          </div>
        }
      />
      <Saved show={!!sp.saved} />
      <GuideForm key={guide.updatedAt.toISOString()} guide={guide} />
    </>
  );
}
