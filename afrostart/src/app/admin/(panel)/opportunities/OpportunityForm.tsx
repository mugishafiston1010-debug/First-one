import type { Opportunity } from "@prisma/client";
import { saveOpportunity } from "@/app/actions/admin";
import { AdminForm, DateField, SelectField, TextArea, TextField, TodayButton } from "@/components/admin/Form";
import { Panel } from "@/components/admin/ui";
import { OPPORTUNITY_TYPES, TRUST_LEVELS } from "@/lib/labels";

export function OpportunityForm({ o }: { o?: Opportunity }) {
  return (
    <AdminForm action={saveOpportunity.bind(null, o?.id ?? null)} submitLabel={o ? "Save" : "Create opportunity"}>
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Panel>
            <div className="space-y-5">
              <TextField name="title" label="Title" required defaultValue={o?.title} />
              <TextArea name="summary" label="Summary" required rows={2} defaultValue={o?.summary} />
              <TextArea name="description" label="Description" required rows={8} defaultValue={o?.description} />
              <TextArea name="eligibility" label="Eligibility" required rows={5} defaultValue={o?.eligibility} hint="Copy eligibility from the official source. Do not guess." />
              <TextField name="countryEligibility" label="Country eligibility" required defaultValue={o?.countryEligibility} placeholder="e.g. Citizens of all African countries" />
            </div>
          </Panel>
          <Panel title="Official links">
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField name="applyUrl" label="Official application link" type="url" required defaultValue={o?.applyUrl} placeholder="https://" />
              <TextField name="sourceName" label="Source name" required defaultValue={o?.sourceName} placeholder="e.g. University website" />
              <TextField name="sourceUrl" label="Source page" type="url" required defaultValue={o?.sourceUrl} placeholder="https://" className="sm:col-span-2" />
            </div>
          </Panel>
        </div>
        <div className="space-y-5">
          <Panel title="Status">
            <div className="space-y-4">
              <SelectField name="status" label="Status" defaultValue={o?.status ?? "DRAFT"} options={[{ value: "DRAFT", label: "Draft (hidden)" }, { value: "OPEN", label: "Open (public)" }, { value: "CLOSED", label: "Closed (public, marked closed)" }]} hint="Open opportunities become “Expired” automatically after the deadline." />
              <DateField name="deadline" label="Application deadline" defaultValue={o?.deadline} hint="Leave empty if the source has no fixed deadline." />
              <div><DateField name="lastVerifiedAt" label="Last verified" defaultValue={o?.lastVerifiedAt} hint="Required to open." /><TodayButton target="lastVerifiedAt" /></div>
              <SelectField name="type" label="Type" defaultValue={o?.type} options={OPPORTUNITY_TYPES} />
              <SelectField name="trust" label="Information type" defaultValue={o?.trust ?? "OFFICIAL"} options={TRUST_LEVELS.map((t) => ({ value: t.value, label: t.label }))} />
              <TextField name="slug" label="URL slug" defaultValue={o?.slug} placeholder="auto from title" />
            </div>
          </Panel>
        </div>
      </div>
    </AdminForm>
  );
}
