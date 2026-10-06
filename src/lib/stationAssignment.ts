/**
 * Post-save safeguard for station assignments: the ids the admin asked for must equal the ids the
 * server reports after the write. Compared as sets (order and duplicates are irrelevant). A missing
 * server list is "cannot confirm", never "matches".
 */
export function sameStationSet(requested: readonly number[], refreshed: readonly number[] | null | undefined): boolean {
  if (!Array.isArray(refreshed)) return false;
  const a = new Set(requested.map(Number));
  const b = new Set(refreshed.map(Number));
  if (a.size !== b.size) return false;
  for (const id of a) if (!b.has(id)) return false;
  return true;
}
