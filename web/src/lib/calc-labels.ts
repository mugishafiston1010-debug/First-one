import type { CalcLabels } from "@/components/Calculator";
import type { TKey } from "@/lib/i18n";

export function calcLabels(t: (k: TKey) => string): CalcLabels {
  return {
    youSend: t("calc.youSend"),
    theyGet: t("calc.theyGet"),
    fee: t("calc.fee"),
    margin: t("calc.margin"),
    totalCost: t("calc.totalCost"),
    youPay: t("calc.youPay"),
    ourRate: t("calc.ourRate"),
    marketRate: t("calc.marketRate"),
    min: t("calc.min"),
    max: t("calc.max"),
    invalid: t("calc.invalid"),
    continue: t("calc.continue"),
  };
}
