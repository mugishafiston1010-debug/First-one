import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BRAND } from "@/lib/brand";
import { getLocale } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: { default: `${BRAND} — Send money between Russia and Rwanda`, template: `%s · ${BRAND}` },
  description: "Send money from Russia to Rwanda and from Rwanda to Russia. MTN MoMo, Airtel Money, bank, Sber, SBP. Full cost shown before you pay.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#17663f", colorScheme: "light" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, settings] = await Promise.all([getLocale(), getSettings()]);
  const notice = locale === "ru" ? settings.noticeRu || settings.noticeEn : settings.noticeEn || settings.noticeRu;
  return (
    <html lang={locale}>
      <body className="min-h-dvh antialiased">
        <Header />
        {notice && <div className="bg-sun px-4 py-2 text-center text-sm font-medium text-ink">{notice}</div>}
        <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
