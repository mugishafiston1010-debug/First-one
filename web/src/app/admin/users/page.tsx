import Link from "next/link";
import { db } from "@/lib/db";
import { toggleSuspend } from "@/app/actions/admin";
import { fmtDate } from "@/lib/format";

export default async function Users({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
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
            {u.role !== "ADMIN" && (
              <form action={toggleSuspend}>
                <input type="hidden" name="id" value={u.id} />
                <button className={u.suspended ? "btn-ghost py-2" : "btn-danger py-2"}>{u.suspended ? "Unsuspend" : "Suspend"}</button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
