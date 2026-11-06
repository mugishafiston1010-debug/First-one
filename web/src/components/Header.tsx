import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { currentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { setLanguage } from "@/app/actions/lang";
import { signOut } from "@/app/actions/auth";

export async function Header() {
  const [user, { t, locale }] = await Promise.all([currentUser(), getT()]);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
        <Link href={user ? "/app" : "/"} className="flex items-center gap-2 font-bold text-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" width={30} height={30} />
          {BRAND}
        </Link>
        <nav className="ml-auto flex items-center gap-1 text-sm">
          {user && (
            <>
              <Link href="/app/send" className="hidden rounded-lg px-3 py-2 font-medium hover:bg-paper sm:block">{t("nav.send")}</Link>
              <Link href="/app/orders" className="hidden rounded-lg px-3 py-2 font-medium hover:bg-paper sm:block">{t("nav.orders")}</Link>
              <Link href="/app/recipients" className="hidden rounded-lg px-3 py-2 font-medium hover:bg-paper md:block">{t("nav.recipients")}</Link>
              {user.role === "ADMIN" && (
                <Link href="/admin" className="rounded-lg bg-ink px-3 py-2 font-medium text-white">{t("nav.admin")}</Link>
              )}
            </>
          )}
          <form action={setLanguage}>
            <input type="hidden" name="lang" value={locale === "ru" ? "en" : "ru"} />
            <button className="rounded-lg px-3 py-2 font-medium text-muted hover:bg-paper" aria-label="Change language">
              {locale === "ru" ? "EN" : "RU"}
            </button>
          </form>
          {user ? (
            <form action={signOut}>
              <button className="rounded-lg px-3 py-2 font-medium text-muted hover:bg-paper">{t("nav.signout")}</button>
            </form>
          ) : (
            <>
              <Link href="/signin" className="rounded-lg px-3 py-2 font-medium hover:bg-paper">{t("nav.signin")}</Link>
              <Link href="/signup" className="rounded-lg bg-brand px-3 py-2 font-semibold text-white hover:bg-brand-dark">{t("nav.signup")}</Link>
            </>
          )}
        </nav>
      </div>
      {user && (
        <nav className="flex border-t border-line text-sm sm:hidden">
          <Link href="/app" className="flex-1 py-2.5 text-center font-medium">{t("nav.dashboard")}</Link>
          <Link href="/app/send" className="flex-1 py-2.5 text-center font-medium text-brand">{t("nav.send")}</Link>
          <Link href="/app/orders" className="flex-1 py-2.5 text-center font-medium">{t("nav.orders")}</Link>
        </nav>
      )}
    </header>
  );
}
