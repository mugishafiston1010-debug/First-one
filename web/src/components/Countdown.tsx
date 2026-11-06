"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function Countdown({ until }: { until: string }) {
  const router = useRouter();
  const end = new Date(until).getTime();
  const [left, setLeft] = useState(() => Math.max(0, end - Date.now()));
  useEffect(() => {
    const id = setInterval(() => {
      const l = Math.max(0, end - Date.now());
      setLeft(l);
      if (l === 0) {
        clearInterval(id);
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [end, router]);
  const s = Math.floor(left / 1000);
  return <span className={`num font-semibold ${s < 300 ? "text-warn" : ""}`}>{Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}</span>;
}
