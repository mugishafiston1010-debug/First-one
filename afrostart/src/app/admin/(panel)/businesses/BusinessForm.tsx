import type { Business } from "@prisma/client";
import { db } from "@/lib/db";
import { saveBusiness } from "@/app/actions/admin";
import { AdminForm, SelectField, TextArea, TextField, Toggle } from "@/components/admin/Form";
import { Panel } from "@/components/admin/ui";
import { BUSINESS_CATEGORIES } from "@/lib/labels";

export async function BusinessForm({ business }: { business?: Business }) {
  const cities = await db.city.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <AdminForm action={saveBusiness.bind(null, business?.id ?? null)} submitLabel={business ? "Save listing" : "Create listing"}>
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Panel>
            <div className="space-y-5">
              <TextField name="name" label="Business name" required defaultValue={business?.name} />
              <div className="grid gap-5 sm:grid-cols-2">
                <SelectField name="category" label="Category" required defaultValue={business?.category} options={BUSINESS_CATEGORIES.map(({ value, label }) => ({ value, label }))} />
                <SelectField name="cityId" label="City" required defaultValue={business?.cityId} empty="Choose…" options={cities.map((c) => ({ value: c.id, label: c.name }))} />
              </div>
              <TextArea name="description" label="Description" required rows={6} defaultValue={business?.description} />
              <TextField name="address" label="Address" defaultValue={business?.address} />
              <TextArea name="openingHours" label="Opening hours" rows={3} defaultValue={business?.openingHours} placeholder={"Mon–Fri 10:00–20:00\nSat 11:00–18:00"} />
            </div>
          </Panel>
          <Panel title="Public contact details">
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField name="phone" label="Phone" defaultValue={business?.phone} />
              <TextField name="email" label="Email" type="email" defaultValue={business?.email} />
              <TextField name="website" label="Website" type="url" defaultValue={business?.website} placeholder="https://" />
              <TextField name="telegram" label="Telegram username" defaultValue={business?.telegram} placeholder="@name" />
              <TextField name="whatsapp" label="WhatsApp number" defaultValue={business?.whatsapp} placeholder="+7…" />
              <TextField name="instagram" label="Instagram" defaultValue={business?.instagram} placeholder="@name" />
              <TextField name="vk" label="VK" defaultValue={business?.vk} placeholder="page name or https://vk.com/…" />
              <TextField name="logoUrl" label="Logo / image URL" type="url" defaultValue={business?.logoUrl} placeholder="https://" />
            </div>
          </Panel>
        </div>
        <div className="space-y-5">
          <Panel title="Status">
            <div className="space-y-3">
              <Toggle name="published" label="Published" hint="Visible in the public directory." defaultChecked={business?.published} />
              <Toggle name="verified" label="Verified" hint="Only if you confirmed the business is real and its contacts work. Never because they paid." defaultChecked={business?.verified} />
              <Toggle name="featured" label="Team pick (free)" hint="Editorial highlight. Shown on the homepage. Not paid." defaultChecked={business?.featured} />
              <TextField name="slug" label="URL slug" defaultValue={business?.slug} placeholder="auto from name" />
            </div>
          </Panel>
        </div>
      </div>
    </AdminForm>
  );
}
