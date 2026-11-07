import type { Metadata } from "next";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/Section";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

async function unsubscribe(fd: FormData) {
  "use server";
  const token = String(fd.get("token") ?? "").slice(0, 100);
  if (token) await db.subscriber.deleteMany({ where: { token } });
  const { redirect } = await import("next/navigation");
  redirect("/unsubscribe?done=1");
}

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string; done?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <PageHeader title={sp.done ? "You are unsubscribed" : "Unsubscribe from updates"} sub={sp.done ? "Your email address has been deleted from our list." : "Press the button to stop receiving AfroStart updates. Your email will be deleted."} />
      {!sp.done && sp.token && (
        <form action={unsubscribe} className="container-x py-10">
          <input type="hidden" name="token" value={sp.token} />
          <button className="btn-primary">Unsubscribe and delete my email</button>
        </form>
      )}
    </>
  );
}
