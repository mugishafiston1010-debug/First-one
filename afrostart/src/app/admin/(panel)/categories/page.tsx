import { db } from "@/lib/db";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { AdminForm, SelectField, TextField } from "@/components/admin/Form";
import { saveCategory } from "@/app/actions/admin";
import { GUIDE_STAGES } from "@/lib/labels";

export default async function Categories() {
  const cats = await db.guideCategory.findMany({ orderBy: [{ stage: "asc" }, { sortOrder: "asc" }], include: { _count: { select: { guides: true } } } });
  const stages = GUIDE_STAGES.map((s) => ({ value: s.value, label: s.label }));
  return (
    <>
      <AdminHeader title="Guide categories" sub="Categories group guides inside the three stages: before travelling, after arriving, student life." />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {GUIDE_STAGES.map((s) => (
            <Panel key={s.value} title={s.label}>
              <div className="space-y-3">
                {cats.filter((c) => c.stage === s.value).map((c) => (
                  <details key={c.id} className="rounded-xl border border-line p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-ink">{c.name} <span className="font-normal text-muted">· {c._count.guides} guides · order {c.sortOrder}</span></summary>
                    <div className="mt-3">
                      <AdminForm action={saveCategory.bind(null, c.id)} idPrefix={`c${c.id}-`}>
                        <div className="grid gap-4 sm:grid-cols-3">
                          <TextField name="name" label="Name" defaultValue={c.name} required />
                          <SelectField name="stage" label="Stage" defaultValue={c.stage} options={stages} />
                          <TextField name="sortOrder" label="Order" type="number" defaultValue={c.sortOrder} />
                        </div>
                        <TextField name="description" label="Description" defaultValue={c.description} />
                      </AdminForm>
                    </div>
                  </details>
                ))}
              </div>
            </Panel>
          ))}
        </div>
        <Panel title="Add category" className="h-fit">
          <AdminForm action={saveCategory.bind(null, null)} submitLabel="Add" resetOnSuccess idPrefix="new-">
            <TextField name="name" label="Name" required />
            <SelectField name="stage" label="Stage" options={stages} />
            <TextField name="sortOrder" label="Order" type="number" defaultValue={100} />
            <TextField name="description" label="Description" />
          </AdminForm>
        </Panel>
      </div>
    </>
  );
}
