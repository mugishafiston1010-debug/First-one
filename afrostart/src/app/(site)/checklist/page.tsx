import type { Metadata } from "next";
import { getDict } from "@/lib/i18n";
import { CHECKLIST } from "@/content/checklist";
import { PageHeader } from "@/components/Section";
import { Checklist } from "@/components/Checklist";

export const metadata: Metadata = {
  title: "Pre-departure checklist for studying in Russia",
  description: "An interactive checklist for African students: university, travel, accommodation, arrival and first-week tasks.",
  alternates: { canonical: "/checklist" },
};

export default async function ChecklistPage() {
  const { t } = await getDict();
  return (
    <>
      <PageHeader eyebrow={t.nav.checklist} title={t.checklist.title} sub={t.checklist.sub} />
      <div className="container-x py-10">
        <Checklist groups={CHECKLIST} labels={t.checklist} />
        <p className="mt-8 max-w-3xl text-xs leading-5 text-muted">This checklist lists general steps. Exact requirements for visas, documents and registration are set by your university and the official authorities — always follow their instructions.</p>
      </div>
    </>
  );
}
