import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { signIn } from "@/app/actions/auth";
import { currentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; send?: string; receive?: string }> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => ["from", "to", "send", "receive"].includes(k) && typeof v === "string") as [string, string][]).toString();
  const next = qs ? `/app/send?${qs}` : undefined;
  if (await currentUser()) redirect(next ?? "/app");
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <h1 className="h2 mb-5">{t("auth.signinTitle")}</h1>
        <AuthForm
          next={next}
          action={signIn}
          submit={t("auth.signinBtn")}
          fields={[
            { name: "email", label: t("auth.email"), type: "email", autoComplete: "email" },
            { name: "password", label: t("auth.password"), type: "password", autoComplete: "current-password" },
          ]}
        />
        <p className="mt-5 text-sm text-muted">
          {t("auth.noAccount")} <Link href={qs ? `/signup?${qs}` : "/signup"} className="font-semibold text-brand">{t("nav.signup")}</Link>
        </p>
      </div>
    </div>
  );
}
