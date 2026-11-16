"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { outstandingTasks, upcomingDeadlines } from "@/lib/selectors";
import { useLibrary } from "@/lib/store/library";
import { Icon, type IconName } from "./ui";

const NAV: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/actions", label: "Actions", icon: "list" },
  { href: "/deadlines", label: "Deadlines", icon: "calendar" },
  { href: "/privacy", label: "Privacy & data", icon: "shield" },
];

export function Wordmark() {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5" aria-label="Clarity home">
      <span className="relative grid size-7 place-items-center rounded-full bg-ink">
        <span className="size-2.5 rounded-full bg-accent transition-transform duration-300 group-hover:scale-125" />
      </span>
      <span className="font-display text-[22px] leading-none tracking-tight">Clarity</span>
    </Link>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { docs, status, ready } = useLibrary();
  const counts: Record<string, number> = {
    "/actions": outstandingTasks(docs).length,
    "/deadlines": upcomingDeadlines(docs).length,
  };
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const currentDoc = pathname.startsWith("/d/") ? decodeURIComponent(pathname.split("/")[2] ?? "") : null;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line px-5 py-6 lg:flex">
        <Wordmark />
        <nav className="mt-9 flex flex-col gap-0.5" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive(item.href) ? "bg-sunken font-medium text-ink" : "text-ink-2 hover:bg-sunken/60 hover:text-ink"
              }`}
            >
              <Icon name={item.icon} size={17} />
              <span className="flex-1">{item.label}</span>
              {counts[item.href] ? <span className="tabular text-xs text-ink-3">{counts[item.href]}</span> : null}
            </Link>
          ))}
        </nav>

        <div className="mt-8 min-h-0 flex-1 overflow-y-auto">
          <p className="eyebrow px-3">Documents</p>
          <div className="mt-2 flex flex-col gap-0.5">
            {ready && docs.length === 0 && <p className="px-3 text-[13px] text-ink-3">Nothing here yet.</p>}
            {docs.slice(0, 12).map((d) => (
              <Link
                key={d.id}
                href={`/d/${d.id}`}
                title={d.name}
                className={`truncate rounded-lg px-3 py-1.5 text-[13px] transition-colors ${
                  currentDoc === d.id ? "bg-sunken font-medium text-ink" : "text-ink-2 hover:bg-sunken/60 hover:text-ink"
                }`}
              >
                {d.name.replace(/\.[a-z]+$/i, "")}
              </Link>
            ))}
          </div>
        </div>

        <Link href="/privacy" className="mt-4 flex items-start gap-2.5 rounded-xl border border-line bg-surface p-3 text-[12px] leading-snug text-ink-2 transition-colors hover:border-line-strong">
          <Icon name={status.claude ? "cloud" : "device"} size={15} className="mt-0.5 text-ink-3" />
          <span>
            <span className="block font-medium text-ink">{status.claude ? "On-device by default" : "Running on this device"}</span>
            {status.claude ? "Claude is available, only when you choose it." : "Your documents never leave this browser."}
          </span>
        </Link>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-3 backdrop-blur lg:hidden">
        <Wordmark />
        <Link href="/privacy" className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-ink-2">
          <Icon name="device" size={12} />
          On-device
        </Link>
      </header>

      <main className="min-w-0 pb-24 lg:pb-0">{children}</main>

      {/* Mobile tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Main">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={`relative flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium ${isActive(item.href) ? "text-ink" : "text-ink-3"}`}
          >
            <span className="relative">
              <Icon name={item.icon} size={20} />
              {counts[item.href] ? (
                <span className="tabular absolute -right-2.5 -top-1.5 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] font-semibold leading-4 text-on-accent">
                  {counts[item.href]}
                </span>
              ) : null}
            </span>
            {item.label.replace(" & data", "")}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function Page({ children, width = "max-w-5xl" }: { children: ReactNode; width?: string }) {
  return <div className={`mx-auto w-full ${width} px-4 py-7 sm:px-8 sm:py-10 lg:px-12 lg:py-12`}>{children}</div>;
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="animate-rise">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="font-display mt-2 text-[34px] leading-[1.08] sm:text-[42px]">{title}</h1>
      {children && <div className="mt-3 max-w-2xl text-[15px] text-ink-2">{children}</div>}
    </header>
  );
}
