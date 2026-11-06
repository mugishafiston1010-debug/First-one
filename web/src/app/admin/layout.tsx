import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const LINKS = [
  ["/admin", "Orders"],
  ["/admin/kyc", "Identity checks"],
  ["/admin/corridors", "Rates & fees"],
  ["/admin/payin", "Pay-in accounts"],
  ["/admin/users", "Users"],
  ["/admin/ledger", "Ledger"],
  ["/admin/settings", "Settings"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 text-sm">
        {LINKS.map(([href, label]) => (
          <Link key={href} href={href} className="whitespace-nowrap rounded-lg border border-line bg-white px-3 py-2 font-medium hover:border-brand">
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
