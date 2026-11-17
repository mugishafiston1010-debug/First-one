import { getT } from "@/lib/i18n";
import { findValidReset } from "@/lib/reset";
import { ResetForm } from "./ResetForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "New password", robots: { index: false } };

export default async function Reset({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [{ t }, valid] = await Promise.all([getT(), findValidReset(token)]);
  return (
    <div className="mx-auto max-w-md card">
      <h1 className="h2 mb-4">{t("reset.title")}</h1>
      {valid ? (
        <ResetForm
          token={token}
          labels={{ password: t("reset.password"), confirm: t("reset.confirm"), button: t("reset.button"), hint: t("auth.passwordHint"), done: t("reset.done"), signin: t("nav.signin") }}
        />
      ) : (
        <p className="error">{t("reset.invalid")}</p>
      )}
    </div>
  );
}
