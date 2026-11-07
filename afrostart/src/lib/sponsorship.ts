/** A placement counts only between its start and end. Pure so it can be unit-tested. */
export function isPlacementActive(p: { startsAt: Date; endsAt: Date }, now: Date = new Date()): boolean {
  return p.startsAt.getTime() <= now.getTime() && now.getTime() <= p.endsAt.getTime();
}

export function activePlacementWhere(slot: "DIRECTORY_TOP" | "HOMEPAGE" | "CITY_PAGE", now: Date = new Date()) {
  return { slot, startsAt: { lte: now }, endsAt: { gte: now } };
}

/**
 * Directory ordering: sponsored first (labelled), then the team's featured picks, then verified, then newest.
 * Verification is never bought: it only affects order after the clearly labelled sponsored block.
 */
export function directorySort<T extends { sponsored: boolean; featured: boolean; verified: boolean; publishedAt: Date | null; name: string }>(
  list: T[],
): T[] {
  return [...list].sort(
    (a, b) =>
      Number(b.sponsored) - Number(a.sponsored) ||
      Number(b.featured) - Number(a.featured) ||
      Number(b.verified) - Number(a.verified) ||
      (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0) ||
      a.name.localeCompare(b.name),
  );
}
