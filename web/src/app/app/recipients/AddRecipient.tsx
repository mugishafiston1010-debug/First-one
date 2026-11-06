"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { NewRecipientForm, type WizardLabels } from "../send/SendWizard";
import { PAYOUT_OPTIONS } from "@/lib/providers";

export function AddRecipient({ labels, title }: { labels: WizardLabels; title: string }) {
  const router = useRouter();
  const [currency, setCurrency] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  return (
    <div className="card space-y-3">
      <h2 className="font-bold">{title}</h2>
      <div className="flex gap-2">
        {Object.entries(PAYOUT_OPTIONS).map(([cur, o]) => (
          <button
            key={cur}
            type="button"
            onClick={() => setCurrency(cur)}
            className={`rounded-xl border px-3 py-2 text-sm font-medium ${currency === cur ? "border-brand bg-brand-soft" : "border-line"}`}
          >
            {o.country} ({cur})
          </button>
        ))}
      </div>
      {currency && (
        <NewRecipientForm
          key={`${currency}-${key}`}
          currency={currency}
          labels={labels}
          onSaved={() => {
            setKey((k) => k + 1);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
