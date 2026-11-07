import type { City } from "@prisma/client";
import { saveCity } from "@/app/actions/admin";
import { AdminForm, DateField, TextArea, TextField, Toggle, TodayButton } from "@/components/admin/Form";
import { Panel } from "@/components/admin/ui";

export function CityForm({ city }: { city?: City }) {
  return (
    <AdminForm action={saveCity.bind(null, city?.id ?? null)} submitLabel={city ? "Save city" : "Create city"}>
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Panel>
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField name="name" label="City name" required defaultValue={city?.name} />
              <TextField name="region" label="Region" defaultValue={city?.region} placeholder="e.g. Tomsk Oblast" />
            </div>
            <TextField name="tagline" label="Tagline" defaultValue={city?.tagline} hint="One line shown on the city card." maxLength={160} />
            <TextArea name="intro" label="Introduction" required rows={8} defaultValue={city?.intro} hint='Same formatting as guides ("## " headings, "- " lists, [links](https://…)).' />
            <TextArea name="transportInfo" label="Transport information" rows={6} defaultValue={city?.transportInfo} />
          </div>
        </Panel>
        <div className="space-y-5">
          <Panel title="Publishing">
            <div className="space-y-4">
              <Toggle name="published" label="Published" defaultChecked={city?.published} />
              <div><DateField name="lastVerifiedAt" label="Last verified" defaultValue={city?.lastVerifiedAt} /><TodayButton target="lastVerifiedAt" /></div>
              <TextField name="sortOrder" label="Display order" type="number" defaultValue={city?.sortOrder ?? 100} hint="Lower numbers appear first." />
              <TextField name="slug" label="URL slug" defaultValue={city?.slug} placeholder="auto from name" />
            </div>
          </Panel>
          <Panel title="Photo">
            <div className="space-y-4">
              <TextField name="imageUrl" label="Image URL" type="url" defaultValue={city?.imageUrl} placeholder="https://" hint="Use only photos you own or that are licensed for reuse." />
              <TextField name="imageCredit" label="Photo credit / licence" defaultValue={city?.imageCredit} placeholder="Author, licence" />
            </div>
          </Panel>
        </div>
      </div>
    </AdminForm>
  );
}
