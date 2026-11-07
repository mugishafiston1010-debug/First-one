import type { Guide, GuideSource } from "@prisma/client";
import { db } from "@/lib/db";
import { saveGuide } from "@/app/actions/admin";
import { AdminForm, DateField, SelectField, TextArea, TextField, Toggle, TodayButton } from "@/components/admin/Form";
import { Panel } from "@/components/admin/ui";
import { TRUST_LEVELS, GUIDE_STAGES } from "@/lib/labels";
import { LOCALES } from "@/lib/i18n/config";

export async function GuideForm({ guide }: { guide?: Guide & { sources: GuideSource[] } }) {
  const [categories, cities] = await Promise.all([
    db.guideCategory.findMany({ orderBy: [{ stage: "asc" }, { sortOrder: "asc" }] }),
    db.city.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const stageLabel = (s: string) => GUIDE_STAGES.find((x) => x.value === s)?.label ?? s;
  return (
    <AdminForm action={saveGuide.bind(null, guide?.id ?? null)} submitLabel={guide ? "Save changes" : "Create guide"}>
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Panel>
            <div className="space-y-5">
              <TextField name="title" label="Title" required defaultValue={guide?.title} maxLength={160} />
              <TextArea name="summary" label="Summary" required rows={2} defaultValue={guide?.summary} hint="One or two sentences. Shown on cards and in search results." />
              <TextArea name="body" label="Body" required rows={20} mono defaultValue={guide?.body} hint='Formatting: blank line = new paragraph · "## " heading · "- " bullet list · "1. " numbered list · **bold** · [link text](https://…)' />
            </div>
          </Panel>
          <Panel title="Sources">
            <TextArea name="sources" label="Source links" rows={5} mono defaultValue={guide?.sources.map((s) => `${s.label} | ${s.url}`).join("\n")} placeholder="Official portal name | https://example.gov/page" hint='One per line: "Label | https://link". Prefer official government and university sources.' />
          </Panel>
        </div>
        <div className="space-y-5">
          <Panel title="Publishing">
            <div className="space-y-4">
              <Toggle name="published" label="Published" hint="Visible to everyone when on." defaultChecked={guide?.published} />
              <div>
                <DateField name="lastVerifiedAt" label="Last verified" defaultValue={guide?.lastVerifiedAt} hint="Date you last checked this guide against its sources." />
                <TodayButton target="lastVerifiedAt" />
              </div>
              <SelectField name="trust" label="Information type" defaultValue={guide?.trust ?? "EDITORIAL"} options={TRUST_LEVELS.map((t) => ({ value: t.value, label: t.label }))} />
            </div>
          </Panel>
          <Panel title="Organisation">
            <div className="space-y-4">
              <SelectField name="categoryId" label="Category" required defaultValue={guide?.categoryId} empty="Choose…" options={categories.map((c) => ({ value: c.id, label: `${stageLabel(c.stage)} — ${c.name}` }))} />
              <SelectField name="cityId" label="City" defaultValue={guide?.cityId} empty="All of Russia" options={cities.map((c) => ({ value: c.id, label: c.name }))} />
              <TextField name="country" label="Country" defaultValue={guide?.country} placeholder="e.g. Russia, Rwanda" maxLength={60} />
              <SelectField name="locale" label="Language" defaultValue={guide?.locale ?? "en"} options={LOCALES.map((l) => ({ value: l.code, label: l.label }))} hint="For a translation, use the same URL slug as the English guide. Publish only reviewed translations." />
              <TextField name="slug" label="URL slug" defaultValue={guide?.slug} placeholder="auto from title" hint="Lowercase letters, numbers, dashes." />
            </div>
          </Panel>
        </div>
      </div>
    </AdminForm>
  );
}
