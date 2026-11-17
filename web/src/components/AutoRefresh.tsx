"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Reloads the page data every few seconds while the tab is visible (no full page reload). */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
