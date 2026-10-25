/**
 * Keeps the signed-in session's permissions in step with the server without a new login (D3). The server resolves
 * permissions on every request and never caches them, so removing a Job Title's eligibility takes effect there at once;
 * this makes the Dashboard follow (navigation, buttons and route guards) within seconds instead of at the next login.
 */

/** How often a visible tab re-reads `/auth/me`. */
export const SESSION_REFRESH_INTERVAL_MS = 45_000;
/** Never refresh more often than this (focus, visibility and 403 events can arrive in bursts). */
export const SESSION_REFRESH_MIN_GAP_MS = 8_000;
/** Dispatched by the API client when the server answers 403 INSUFFICIENT_PERMISSIONS: the session may be stale. */
export const PERMISSIONS_STALE_EVENT = "servexa:permissions-stale";

export const shouldRefreshSession = (now: number, last: number, minGap = SESSION_REFRESH_MIN_GAP_MS): boolean => now - last >= minGap;

/** True when two permission lists hold the same codes (order-insensitive). */
export function samePermissions(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((p) => set.has(p));
}

/** Keep the previous reference when the content is unchanged, so a refresh that changed nothing re-renders nothing. */
export function keepIfEqual<T>(prev: T, next: T): T {
  return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
}
