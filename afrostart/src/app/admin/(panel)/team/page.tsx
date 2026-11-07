import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminHeader, Panel, Pill } from "@/components/admin/ui";
import { AdminForm, SelectField, TextField } from "@/components/admin/Form";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { addAdmin, changeOwnPassword, setAdminActive } from "@/app/actions/admin";
import { fmtDate } from "@/components/Dates";

export default async function Team() {
  const me = await requireAdmin();
  const admins = await db.adminUser.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, role: true, active: true, lastLoginAt: true } });
  return (
    <>
      <AdminHeader title="Team & account" sub="Owners manage the team. Editors manage content and review submissions." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Team">
          <ul className="divide-y divide-line">
            {admins.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span>
                  <span className="block font-semibold text-ink">{a.name} {a.id === me.id && <span className="text-muted">(you)</span>}</span>
                  <span className="block text-xs text-muted">{a.email} · last sign-in {a.lastLoginAt ? fmtDate(a.lastLoginAt) : "never"}</span>
                </span>
                <span className="flex items-center gap-2">
                  <Pill tone={a.role === "OWNER" ? "blue" : "gray"}>{a.role.toLowerCase()}</Pill>
                  {!a.active && <Pill tone="red">inactive</Pill>}
                  {me.role === "OWNER" && a.id !== me.id && (
                    <ConfirmButton action={setAdminActive.bind(null, a.id, !a.active)} confirm={a.active ? `Deactivate ${a.name}? They are signed out immediately.` : `Reactivate ${a.name}?`}>{a.active ? "Deactivate" : "Activate"}</ConfirmButton>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <div className="space-y-6">
          {me.role === "OWNER" && (
            <Panel title="Add admin">
              <AdminForm action={addAdmin} submitLabel="Add admin" resetOnSuccess idPrefix="add-">
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField name="name" label="Name" required />
                  <TextField name="email" label="Email" type="email" required />
                  <TextField name="password" label="Temporary password" type="password" required hint="At least 12 characters. Share it privately; ask them to change it." />
                  <SelectField name="role" label="Role" defaultValue="EDITOR" options={[{ value: "EDITOR", label: "Editor" }, { value: "OWNER", label: "Owner" }]} />
                </div>
              </AdminForm>
            </Panel>
          )}
          <Panel title="Change my password">
            <AdminForm action={changeOwnPassword} submitLabel="Change password" resetOnSuccess>
              <TextField name="current" label="Current password" type="password" required />
              <TextField name="next" label="New password" type="password" required hint="At least 12 characters." />
            </AdminForm>
          </Panel>
        </div>
      </div>
    </>
  );
}
