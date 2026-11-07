import type { Metadata } from "next";
import { BadgeCheck, Clock, Megaphone } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/Section";
import { SubmissionForm } from "./SubmissionForm";
import { BUSINESS_CATEGORIES } from "@/lib/labels";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "List your business",
  description: "Offer services to African students in Russia? Submit your business to the AfroStart directory. Every listing is reviewed before publication.",
  alternates: { canonical: "/list-your-business" },
};

export default async function ListYourBusinessPage() {
  const cities = await db.city.findMany({ where: { published: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } });
  return (
    <>
      <PageHeader eyebrow="For businesses" title="List your business" sub="Reach African students across Russia. Listing is free. Our team reviews every submission before it is published." />
      <div className="container-x grid gap-10 py-10 lg:grid-cols-[1fr_340px]">
        <SubmissionForm cities={cities} categories={BUSINESS_CATEGORIES.map(({ value, label }) => ({ value, label }))} />
        <aside className="space-y-4">
          {[
            [Clock, "Reviewed before publishing", "We check every submission. We may contact you to confirm details. Nothing appears publicly until approved."],
            [BadgeCheck, "Verification is free and earned", "“Verified” means we confirmed your business is real and reachable. It cannot be bought."],
            [Megaphone, "Sponsored placements", "Later, businesses will be able to pay for more visible positions. They are always labelled “Sponsored”."],
          ].map(([Icon, title, body], i) => {
            const I = Icon as typeof Clock;
            return (
              <div key={i} className="card p-5">
                <I className="h-6 w-6 text-brand-600" />
                <h2 className="mt-3 font-bold text-ink">{title as string}</h2>
                <p className="mt-1 text-sm leading-6 text-muted">{body as string}</p>
              </div>
            );
          })}
          <p className="px-1 text-xs leading-5 text-muted">We only ask for what we need to review your listing. Contact details you give for review are not published unless you also add them to the listing. See <a className="underline" href="/privacy">Privacy</a>.</p>
        </aside>
      </div>
    </>
  );
}
