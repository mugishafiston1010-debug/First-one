"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

export function MobileMenu({ links, cta, menuLabel }: { links: { href: string; label: string }[]; cta: { href: string; label: string }; menuLabel: string }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  return (
    <div className="lg:hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-nav" className="rounded-lg p-2 text-ink hover:bg-brand-50">
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        <span className="sr-only">{menuLabel}</span>
      </button>
      {open && (
        <div id="mobile-nav" className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t border-line bg-white px-4 py-6 animate-rise">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={`rounded-xl px-4 py-3.5 text-base font-semibold ${path.startsWith(l.href) ? "bg-brand-50 text-brand-700" : "text-ink hover:bg-canvas"}`}>
                {l.label}
              </Link>
            ))}
          </nav>
          <Link href={cta.href} className="btn-primary mt-6 w-full">{cta.label}</Link>
        </div>
      )}
    </div>
  );
}
