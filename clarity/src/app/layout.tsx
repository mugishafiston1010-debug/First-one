import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Shell } from "@/components/Shell";
import { ToastProvider } from "@/components/ui";
import { LibraryProvider } from "@/lib/store/library";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Clarity", template: "%s · Clarity" },
  description: "Turn long, confusing documents into clear explanations, tasks and deadlines. Know exactly what to do next.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f2ec" },
    { media: "(prefers-color-scheme: dark)", color: "#141311" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LibraryProvider>
          <ToastProvider>
            <Shell>{children}</Shell>
          </ToastProvider>
        </LibraryProvider>
      </body>
    </html>
  );
}
