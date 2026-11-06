import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { signUp } from "@/app/actions/auth";
import { currentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export const metadata = { title: "Create account" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; send?: string; receive?: string }> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => ["from", "to", "send", "receive"].includes(k) && typeof v === "string") as [string, string][]).toString();
  const next = qs ? `/app/send?${qs}` : undefined;
  if (await currentUser()) redirect(next ?? "/app");
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <h1 className="h2 mb-5">{t("auth.signupTitle")}</h1>
        <AuthForm
          next={next}
          action={signUp}
          submit={t("auth.signupBtn")}
          fields={[
            { name: "fullName", label: t("auth.fullName"), autoComplete: "name" },
            { name: "email", label: t("auth.email"), type: "email", autoComplete: "email" },
            { name: "phone", label: t("auth.phone"), type: "tel", hint: t("auth.phoneHint"), autoComplete: "tel" },
            { name: "password", label: t("auth.password"), type: "password", hint: t("auth.passwordHint"), autoComplete: "new-password" },
          ]}
        />
        <p className="mt-4 text-xs text-muted">{t("auth.terms")}</p>
        <p className="mt-4 text-sm text-muted">
          {t("auth.haveAccount")} <Link href={qs ? `/signin?${qs}` : "/signin"} className="font-semibold text-brand">{t("nav.signin")}</Link>
        </p>
      </div>
    </div>
  );
}
