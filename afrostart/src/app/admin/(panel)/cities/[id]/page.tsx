import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { AdminHeader, Panel, Pill, Saved } from "@/components/admin/ui";
import { AdminForm, DateField, SelectField, TextArea, TextField, Toggle } from "@/components/admin/Form";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { addCityResource, addUniversity, deleteCity, deleteCityResource, deleteUniversity } from "@/app/actions/admin";
import { CITY_RESOURCE_KINDS, TRUST_LEVELS, trustInfo } from "@/lib/labels";
import { fmtDate } from "@/components/Dates";
import { CityForm } from "../CityForm";

export default async function EditCity({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const city = await db.city.findUnique({ where: { id }, include: { universities: { orderBy: { name: "asc" } }, resources: { orderBy: [{ kind: "asc" }, { title: "asc" }] } } });
  if (!city) notFound();
  return (
    <>
      <AdminHeader
        title={city.name}
        sub={`City · ${city.published ? "Published" : "Hidden"}`}
        action={
          <div className="flex gap-2">
            {city.published && <Link href={`/cities/${city.slug}`} target="_blank" className="btn-ghost btn-sm">View <ExternalLink className="h-3.5 w-3.5" /></Link>}
            <ConfirmButton action={deleteCity.bind(null, city.id)} confirm="Delete this city with its universities and resources?" className="btn-danger btn-sm">Delete</ConfirmButton>
          </div>
        }
      />
      <Saved show={!!sp.saved} />
      {sp.error === "has-businesses" && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">This city has business listings. Move or delete them first.</p>}
      <CityForm key={city.updatedAt.toISOString()} city={city} />

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Panel title={`Universities (${city.universities.length})`}>
          <ul className="mb-6 divide-y divide-line">
            {city.universities.map((u) => (
              <li key={u.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                <span>
                  <span className="block font-semibold text-ink">{u.name}{u.shortName && <span className="font-normal text-muted"> ({u.shortName})</span>}</span>
                  {u.websiteUrl && <a href={u.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600">{u.websiteUrl}</a>}
                  <span className="block text-xs text-muted">{u.lastVerifiedAt ? `Verified ${fmtDate(u.lastVerifiedAt)}` : "Not verified"}</span>
                </span>
                <ConfirmButton action={deleteUniversity.bind(null, u.id)} confirm={`Remove ${u.name}?`}>Remove</ConfirmButton>
              </li>
            ))}
          </ul>
          <h3 className="mb-3 text-sm font-bold text-ink">Add university</h3>
          <AdminForm action={addUniversity.bind(null, city.id)} submitLabel="Add university" resetOnSuccess idPrefix="uni-">
            <TextField name="name" label="Full name" required />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="shortName" label="Short name" placeholder="e.g. TPU" />
              <TextField name="websiteUrl" label="Official website" type="url" placeholder="https://" />
            </div>
            <TextArea name="description" label="Short description" rows={2} />
            <Toggle name="verifiedNow" label="I checked the website today" />
          </AdminForm>
        </Panel>

        <Panel title={`Resources (${city.resources.length})`}>
          <ul className="mb-6 divide-y divide-line">
            {city.resources.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                <span>
                  <span className="block font-semibold text-ink">{r.title}</span>
                  <span className="block text-xs text-muted">{CITY_RESOURCE_KINDS.find((k) => k.value === r.kind)?.label} · {trustInfo(r.trust).label} · {r.lastVerifiedAt ? `verified ${fmtDate(r.lastVerifiedAt)}` : "not verified"}</span>
                </span>
                <ConfirmButton action={deleteCityResource.bind(null, r.id)} confirm={`Remove ${r.title}?`}>Remove</ConfirmButton>
              </li>
            ))}
            {!city.resources.length && <li className="py-3 text-sm text-muted"><Pill tone="gray">None yet</Pill></li>}
          </ul>
          <h3 className="mb-3 text-sm font-bold text-ink">Add resource</h3>
          <AdminForm action={addCityResource.bind(null, city.id)} submitLabel="Add resource" resetOnSuccess idPrefix="res-">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField name="kind" label="Type" options={CITY_RESOURCE_KINDS} />
              <SelectField name="trust" label="Information type" defaultValue="OFFICIAL" options={TRUST_LEVELS.map((t) => ({ value: t.value, label: t.label }))} />
            </div>
            <TextField name="title" label="Title" required />
            <TextArea name="description" label="Description" required rows={3} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="url" label="Link" type="url" placeholder="https://" />
              <TextField name="address" label="Address" />
            </div>
            <DateField name="lastVerifiedAt" label="Last verified" />
          </AdminForm>
        </Panel>
      </div>
    </>
  );
}
