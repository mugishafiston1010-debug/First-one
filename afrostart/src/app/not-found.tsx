import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="container-x flex min-h-[50vh] flex-col items-center justify-center py-20 text-center">
        <p className="font-display text-7xl font-extrabold text-brand-100">404</p>
        <h1 className="mt-4 text-2xl font-extrabold text-ink">Page not found</h1>
        <p className="mt-2 text-muted">It may have moved or is no longer published.</p>
        <Link href="/" className="btn-primary mt-6">Back to home</Link>
      </main>
      <Footer />
    </>
  );
}
