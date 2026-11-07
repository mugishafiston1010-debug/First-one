import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/admin/Sidebar";
import { logout } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const pending = await db.businessSubmission.count({ where: { status: "PENDING" } });
  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar pending={pending} name={admin.name} role={admin.role} logout={logout} />
      <main className="px-4 py-6 sm:px-8 sm:py-8 lg:ml-64">{children}</main>
    </div>
  );
}
