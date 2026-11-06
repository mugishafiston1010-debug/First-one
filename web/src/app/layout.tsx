import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BRAND } from "@/lib/brand";
import { getLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: { default: `${BRAND} — Send money between Russia and Rwanda`, template: `%s · ${BRAND}` },
  description: "Send money from Russia to Rwanda and from Rwanda to Russia. MTN MoMo, Airtel Money, bank, Sber, SBP. Full cost shown before you pay.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#17663f" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className="min-h-dvh antialiased">
        <Header />
        <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
