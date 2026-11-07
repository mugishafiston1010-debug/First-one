/** What readers see. EXPIRED is computed from the deadline, never stored, so it can never go stale. */
export type EffectiveStatus = "DRAFT" | "OPEN" | "CLOSED" | "EXPIRED";

export function effectiveStatus(
  o: { status: "DRAFT" | "OPEN" | "CLOSED"; deadline: Date | null },
  now: Date = new Date(),
): EffectiveStatus {
  if (o.status !== "OPEN") return o.status;
  // A deadline is valid until the end of that day (UTC).
  if (o.deadline && endOfDayUtc(o.deadline).getTime() < now.getTime()) return "EXPIRED";
  return "OPEN";
}

export function endOfDayUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

/** Prisma filter for opportunities that are currently open (status OPEN and deadline today or later, or no deadline). */
export function openWhere(now: Date = new Date()) {
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return {
    status: "OPEN" as const,
    OR: [{ deadline: null }, { deadline: { gte: startOfToday } }],
  };
}

export function daysLeft(deadline: Date, now: Date = new Date()): number {
  // 0 = closes today
  return Math.floor((endOfDayUtc(deadline).getTime() - now.getTime()) / 86_400_000);
}
