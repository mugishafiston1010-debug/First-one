const STYLE: Record<string, [string, string]> = {
  PASS: ["bg-brand-soft text-brand-dark", "AI ✓ match"],
  REVIEW: ["bg-amber-50 text-amber-800", "AI ⚠ check"],
  FAIL: ["bg-red-50 text-danger", "AI ✗ problem"],
  ERROR: ["bg-gray-100 text-gray-600", "AI – unread"],
};

export function AiBadge({ verdict }: { verdict: string | null }) {
  if (!verdict) return null;
  const [cls, label] = STYLE[verdict] ?? STYLE.ERROR;
  return <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{label}</span>;
}
