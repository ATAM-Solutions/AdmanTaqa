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

/**
 * Stations whose DESIGNATED manager is this user and which the save would remove from the user's access.
 * The server clears the manager pointer in exactly this case (a station may not point at a manager who cannot
 * reach it); the dashboard must warn BEFORE submitting. Pure, so it can be tested.
 */
export function designatedStationsLosingAccess<B extends { id: number; managerUserId?: number | null }>(
  userId: number | string,
  initialIds: readonly number[],
  selectedIds: readonly number[],
  stations: readonly B[],
): B[] {
  const selected = new Set(selectedIds.map(Number));
  const initial = new Set(initialIds.map(Number));
  const uid = Number(userId);
  return stations.filter((s) => s.managerUserId === uid && initial.has(s.id) && !selected.has(s.id));
}
