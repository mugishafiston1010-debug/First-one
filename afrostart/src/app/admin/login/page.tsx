import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/auth";
import { LoginForm } from "./LoginForm";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = { title: "Team sign-in", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await currentAdmin()) redirect("/admin");
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo light /></div>
        <div className="card p-7">
          <h1 className="text-xl font-extrabold text-ink">Team sign-in</h1>
          <p className="mt-1 text-sm text-muted">For AfroStart administrators only.</p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
