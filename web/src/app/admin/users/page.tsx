import Link from "next/link";
import { db } from "@/lib/db";
import { toggleAdmin, toggleSuspend } from "@/app/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { ResetLinkButton } from "@/components/ResetLinkButton";
import { fmtDate } from "@/lib/format";

export default async function Users({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const me = await requireAdmin();
  const users = await db.user.findMany({
    where: q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { fullName: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { _count: { select: { orders: true } } },
  });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h1">Users</h1>
        <p className="w-full text-sm text-muted">Forgot password? Check it is really the customer (same WhatsApp number as in the account), then send them a reset link. It works once and for 24 hours. &ldquo;Make admin&rdquo; gives full access: only for people you trust.</p>
        <form><input name="q" defaultValue={q} placeholder="Name, email or phone" className="input py-2" /></form>
      </div>
      <div className="divide-y divide-line rounded-2xl border border-line bg-white">
        {users.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
            <div>
              <div className="font-semibold">{u.fullName} {u.role === "ADMIN" && <span className="text-sky">(admin)</span>}</div>
              <div className="text-muted">{u.email} · {u.phone ?? "—"} · joined {fmtDate(u.createdAt, "en")}</div>
              <div className="text-muted">Identity: <b>{u.kycStatus}</b> · <Link className="text-brand" href={`/admin?q=${encodeURIComponent(u.email)}`}>{u._count.orders} orders</Link></div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ResetLinkButton userId={u.id} />
              {u.id !== me.id && (
                <form action={toggleAdmin}>
                  <input type="hidden" name="id" value={u.id} />
                  <button className="btn-ghost py-2 text-sm">{u.role === "ADMIN" ? "Remove admin" : "Make admin"}</button>
                </form>
              )}
              {u.role !== "ADMIN" && (
                <form action={toggleSuspend}>
                  <input type="hidden" name="id" value={u.id} />
                  <button className={u.suspended ? "btn-ghost py-2 text-sm" : "btn-danger py-2 text-sm"}>{u.suspended ? "Unsuspend" : "Suspend"}</button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
