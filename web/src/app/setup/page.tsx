import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SetupForm } from "./SetupForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Setup", robots: { index: false } };

export default async function SetupPage() {
  if (await db.user.findFirst({ where: { role: "ADMIN" } })) redirect("/signin");
  return (
    <div className="mx-auto max-w-md card">
      <h1 className="h2 mb-1">First setup</h1>
      <p className="mb-5 text-sm text-muted">Create the admin account. This page disappears once an admin exists.</p>
      <SetupForm />
    </div>
  );
}
