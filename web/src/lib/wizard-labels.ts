import type { WizardLabels } from "@/app/app/send/SendWizard";
import type { TKey } from "@/lib/i18n";
import { calcLabels } from "./calc-labels";

export function wizardLabels(t: (k: TKey) => string): WizardLabels {
  return {
    ...calcLabels(t),
    step1: t("send.step1"),
    step2: t("send.step2"),
    step3: t("send.step3"),
    chooseRecipient: t("send.chooseRecipient"),
    newRecipient: t("send.newRecipient"),
    savedRecipients: t("send.savedRecipients"),
    recipientName: t("send.recipientName"),
    method: t("send.method"),
    provider: t("send.provider"),
    account: t("send.account"),
    review: t("send.review"),
    confirm: t("send.confirm"),
    priceLocked: t("send.priceLocked"),
    back: t("send.back"),
    recipient: t("order.recipient"),
    methods: {
      MOBILE_MONEY: t("method.MOBILE_MONEY"),
      BANK_ACCOUNT: t("method.BANK_ACCOUNT"),
      CARD: t("method.CARD"),
      SBP_PHONE: t("method.SBP_PHONE"),
    },
  };
}
