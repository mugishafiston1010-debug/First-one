"use client";
import { useState } from "react";

export function CopyButton({ value, label, done }: { value: string; label: string; done: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setOk(true);
          setTimeout(() => setOk(false), 1500);
        } catch {
          /* clipboard blocked: user can still select the text */
        }
      }}
      className="shrink-0 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold hover:bg-paper"
    >
      {ok ? done : label}
    </button>
  );
}
