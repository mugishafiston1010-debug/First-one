import Link from "next/link";
import { Logo } from "./Logo";
import { getDict } from "@/lib/i18n";

export async function Footer() {
  const { t } = await getDict();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 bg-brand-950 text-white/70">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <Logo light />
          <p className="mt-4 max-w-xs text-sm leading-6">{t.footer.tagline}</p>
        </div>
        <FooterCol title={t.footer.explore} links={[
          { href: "/guides", label: t.nav.guides },
          { href: "/cities", label: t.nav.cities },
          { href: "/opportunities", label: t.nav.opportunities },
          { href: "/checklist", label: t.nav.checklist },
        ]} />
        <FooterCol title={t.footer.forBusiness} links={[
          { href: "/services", label: t.nav.services },
          { href: "/list-your-business", label: t.nav.listBusiness },
        ]} />
        <FooterCol title={t.footer.about} links={[
          { href: "/about", label: t.footer.about },
          { href: "/trust", label: t.footer.trust },
          { href: "/privacy", label: "Privacy" },
        ]} />
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-4 py-6 text-xs leading-5 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-3xl">{t.footer.disclaimer}</p>
          <div className="flex shrink-0 gap-4">
            <span>© {year} AfroStart Russia</span>
            <Link href="/admin" className="hover:text-white">{t.footer.admin}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="mb-4 text-sm font-semibold text-white">{title}</p>
      <ul className="space-y-2.5 text-sm">
        {links.map((l) => <li key={l.href}><Link href={l.href} className="hover:text-white">{l.label}</Link></li>)}
      </ul>
    </div>
  );
}
