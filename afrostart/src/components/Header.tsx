import Link from "next/link";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { LanguageSelect } from "./LanguageSelect";
import { NavLinks } from "./NavLinks";
import { getDict } from "@/lib/i18n";

export async function Header() {
  const { t, locale } = await getDict();
  const links = [
    { href: "/guides", label: t.nav.guides },
    { href: "/cities", label: t.nav.cities },
    { href: "/services", label: t.nav.services },
    { href: "/opportunities", label: t.nav.opportunities },
    { href: "/checklist", label: t.nav.checklist },
  ];
  const cta = { href: "/list-your-business", label: t.nav.listBusiness };
  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-white/85 backdrop-blur-lg supports-[backdrop-filter]:bg-white/75">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-brand-600 focus:px-3 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="AfroStart Russia — home"><Logo /></Link>
        <NavLinks links={links} />
        <div className="flex items-center gap-1 sm:gap-2">
          <LanguageSelect locale={locale} label={t.nav.language} soon={t.nav.soon} />
          <Link href={cta.href} className="btn-primary btn-sm hidden sm:inline-flex lg:px-4 lg:py-2.5 lg:text-sm">{cta.label}</Link>
          <MobileMenu links={links} cta={cta} menuLabel={t.nav.menu} />
        </div>
      </div>
    </header>
  );
}
