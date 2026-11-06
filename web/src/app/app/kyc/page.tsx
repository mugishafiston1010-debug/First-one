import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { KycForm } from "./KycForm";

export default async function KycPage() {
  const user = await requireUser();
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="h1">{t("kyc.title")}</h1>
      {user.kycStatus === "APPROVED" && <div className="notice">{t("kyc.approved")}</div>}
      {user.kycStatus === "PENDING" && <div className="notice">{t("kyc.pending")}</div>}
      {(user.kycStatus === "NONE" || user.kycStatus === "REJECTED") && (
        <div className="card">
          <p className="mb-4 text-sm text-muted">{t("kyc.intro")}</p>
          <KycForm
            labels={{
              dob: t("kyc.dob"),
              passportNo: t("kyc.passportNo"),
              nationality: t("kyc.nationality"),
              passport: t("kyc.passport"),
              selfie: t("kyc.selfie"),
              submit: t("kyc.submit"),
              done: t("kyc.pending"),
            }}
          />
        </div>
      )}
    </div>
  );
}
