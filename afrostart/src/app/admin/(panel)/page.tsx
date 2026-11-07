import Link from "next/link";
import { ArrowRight, Award, BookOpen, Inbox, Map, Store, Mail } from "lucide-react";
import { db } from "@/lib/db";
import { openWhere } from "@/lib/opportunity-status";
import { AdminHeader, Panel, Pill } from "@/components/admin/ui";
import { fmtDate } from "@/components/Dates";
import { businessCategoryLabel } from "@/lib/labels";

export default async function AdminHome() {
  const now = new Date();
  const [guides, guideDrafts, cities, businesses, bizUnpublished, pending, opps, expiredOpen, subscribers, recent, audit, unverifiedGuides] = await Promise.all([
    db.guide.count({ where: { published: true } }),
    db.guide.count({ where: { published: false } }),
    db.city.count({ where: { published: true } }),
    db.business.count({ where: { published: true } }),
    db.business.count({ where: { published: false } }),
    db.businessSubmission.count({ where: { status: "PENDING" } }),
    db.opportunity.count({ where: openWhere(now) }),
    db.opportunity.count({ where: { status: "OPEN", deadline: { lt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) } } }),
    db.subscriber.count(),
    db.businessSubmission.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { city: { select: { name: true } } } }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { admin: { select: { name: true } } } }),
    db.guide.count({ where: { published: true, lastVerifiedAt: null } }),
  ]);

  const stats = [
    { label: "Published guides", value: guides, sub: `${guideDrafts} drafts`, href: "/admin/guides", Icon: BookOpen },
    { label: "City pages", value: cities, sub: "published", href: "/admin/cities", Icon: Map },
    { label: "Business listings", value: businesses, sub: `${bizUnpublished} not published`, href: "/admin/businesses", Icon: Store },
    { label: "Pending submissions", value: pending, sub: "awaiting review", href: "/admin/submissions", Icon: Inbox, hot: pending > 0 },
    { label: "Open opportunities", value: opps, sub: `${expiredOpen} expired automatically`, href: "/admin/opportunities", Icon: Award },
    { label: "Subscribers", value: subscribers, sub: "newsletter", href: "/admin/subscribers", Icon: Mail },
  ];

  return (
    <>
      <AdminHeader title="Overview" sub="Everything published on AfroStart Russia, at a glance." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className={`card card-hover flex items-center gap-4 p-5 ${s.hot ? "ring-2 ring-sun-300" : ""}`}>
            <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.hot ? "bg-sun-100 text-sun-700" : "bg-brand-50 text-brand-600"}`}><s.Icon className="h-6 w-6" /></span>
            <span>
              <span className="block text-sm text-muted">{s.label}</span>
              <span className="block font-display text-3xl font-extrabold text-ink">{s.value}</span>
              <span className="block text-xs text-muted">{s.sub}</span>
            </span>
          </Link>
        ))}
      </div>

      {unverifiedGuides > 0 && (
        <p className="mt-6 rounded-xl bg-sun-50 px-4 py-3 text-sm text-sun-700 ring-1 ring-sun-100">
          {unverifiedGuides} published {unverifiedGuides === 1 ? "guide has" : "guides have"} no “last verified” date. Readers see “Not yet verified”. <Link href="/admin/guides?filter=unverified" className="font-semibold underline">Review them</Link>.
        </p>
      )}

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Panel title="Recent submissions">
          {recent.length ? (
            <ul className="divide-y divide-line">
              {recent.map((s) => (
                <li key={s.id}>
                  <Link href={`/admin/submissions/${s.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-brand-700">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink">{s.name}</span>
                      <span className="block text-xs text-muted">{businessCategoryLabel(s.category)} · {s.city?.name ?? s.cityOther} · {fmtDate(s.createdAt)}</span>
                    </span>
                    <Pill tone={s.status === "PENDING" ? "amber" : s.status === "APPROVED" ? "green" : "gray"}>{s.status.toLowerCase()}</Pill>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">No submissions yet.</p>}
          <Link href="/admin/submissions" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">All submissions <ArrowRight className="h-4 w-4" /></Link>
        </Panel>
        <Panel title="Recent activity">
          {audit.length ? (
            <ul className="space-y-2.5 text-sm">
              {audit.map((a) => (
                <li key={a.id} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate"><strong className="text-ink">{a.admin?.name ?? "—"}</strong> <span className="text-muted">{a.action} {a.entity}{a.detail ? `: ${a.detail}` : ""}</span></span>
                  <span className="shrink-0 text-xs text-muted">{a.createdAt.toISOString().slice(0, 16).replace("T", " ")}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">No activity yet.</p>}
        </Panel>
      </div>
    </>
  );
}
