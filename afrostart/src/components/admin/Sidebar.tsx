"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Award, BookOpen, FolderTree, Inbox, LayoutDashboard, Map, Menu, Store, Users, X, Mail } from "lucide-react";
import { LogoMark } from "@/components/Logo";

const ITEMS = [
  { href: "/admin", label: "Overview", Icon: LayoutDashboard, exact: true },
  { href: "/admin/submissions", label: "Submissions", Icon: Inbox, badge: "pending" },
  { href: "/admin/businesses", label: "Businesses", Icon: Store },
  { href: "/admin/guides", label: "Guides", Icon: BookOpen },
  { href: "/admin/categories", label: "Guide categories", Icon: FolderTree },
  { href: "/admin/cities", label: "Cities", Icon: Map },
  { href: "/admin/opportunities", label: "Opportunities", Icon: Award },
  { href: "/admin/subscribers", label: "Subscribers", Icon: Mail },
  { href: "/admin/team", label: "Team & account", Icon: Users },
];

export function Sidebar({ pending, name, role, logout }: { pending: number; name: string; role: string; logout: () => Promise<void> }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const nav = (
    <nav className="space-y-1" aria-label="Admin">
      {ITEMS.map(({ href, label, Icon, exact, badge }) => {
        const active = exact ? path === href : path.startsWith(href);
        return (
          <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${active ? "bg-white/10 text-white" : "text-white/65 hover:bg-white/5 hover:text-white"}`}>
            <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />{label}
            {badge && pending > 0 && <span className="ml-auto rounded-full bg-sun-400 px-2 py-0.5 text-xs font-bold text-brand-950">{pending}</span>}
          </Link>
        );
      })}
    </nav>
  );
  const footer = (
    <div className="border-t border-white/10 pt-4 text-sm">
      <p className="truncate font-semibold text-white">{name}</p>
      <p className="text-xs text-white/50">{role === "OWNER" ? "Owner" : "Editor"}</p>
      <div className="mt-3 flex gap-2">
        <Link href="/" className="btn btn-sm border border-white/15 text-white/80 hover:bg-white/5">View site</Link>
        <form action={logout}><button className="btn btn-sm border border-white/15 text-white/80 hover:bg-white/5">Sign out</button></form>
      </div>
    </div>
  );
  return (
    <>
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between bg-brand-950 px-4 lg:hidden">
        <Link href="/admin" className="flex items-center gap-2 font-display font-bold text-white"><LogoMark className="h-7 w-7" />Admin</Link>
        <button onClick={() => setOpen(!open)} className="p-2 text-white" aria-expanded={open} aria-label="Menu">{open ? <X /> : <Menu />}</button>
      </div>
      {open && <div className="fixed inset-0 top-14 z-30 flex flex-col justify-between overflow-y-auto bg-brand-950 p-4 lg:hidden">{nav}{footer}</div>}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col justify-between bg-brand-950 p-4 lg:flex">
        <div>
          <Link href="/admin" className="mb-8 flex items-center gap-2.5 px-2 pt-2 font-display font-bold text-white"><LogoMark className="h-8 w-8" />AfroStart Admin</Link>
          {nav}
        </div>
        {footer}
      </aside>
    </>
  );
}
