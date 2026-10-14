/**
 * Client side of the backend's RATE_LIMITED contract (Report 3 findings 17/21/25).
 *
 * Detection uses machine-readable signals only: HTTP 429 or the stable `code: "RATE_LIMITED"`.
 * The wait comes from `errors.retryAfterSeconds` (JSON body) or the `Retry-After` header — the backend
 * exposes the header to browsers via CORS.
 *
 * A module-level cooldown stops the app from hammering a limiter that has already answered: while it is
 * active the axios request interceptor fails requests locally (no network call) with the same error shape,
 * so React Query retries, window-focus refetches and the notification poll cannot extend the lockout.
 */
export interface RateLimitInfo {
  retryAfterSeconds: number;
}

type ErrorLike = {
  response?: { status?: number; data?: unknown; headers?: Record<string, unknown> };
};

const DEFAULT_RETRY_SECONDS = 60;
const MAX_COOLDOWN_SECONDS = 15 * 60;

/**
 * The cooldown belongs to ONE session identity. A 429 answers the caller's own bucket (per user, or per IP
 * for anonymous calls), so it must neither block another account that signs in on the same browser nor
 * survive a sign-out. Identity = the user id inside the access token (stable across token refresh), or
 * "anon" when no token is sent. The id is read only to key local UI state — it is never trusted for access.
 */
export function sessionKeyFromToken(token: string | null | undefined): string {
  if (!token) return "anon";
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const userId = (JSON.parse(json) as { userId?: unknown }).userId;
    return typeof userId === "number" || typeof userId === "string" ? `user:${userId}` : `token:${token.slice(-12)}`;
  } catch {
    return `token:${token.slice(-12)}`;
  }
}

/** Key for whoever is signed in on this browser right now. */
export function currentSessionKey(): string {
  return sessionKeyFromToken(typeof localStorage === "undefined" ? null : localStorage.getItem("access_token"));
}

const cooldownUntil = new Map<string, number>();
const listeners = new Set<() => void>();

export function readRetryAfterSeconds(err: ErrorLike): number | undefined {
  const data = err.response?.data;
  const fromBody =
    data && typeof data === "object" && "errors" in data
      ? Number((data as { errors?: { retryAfterSeconds?: unknown } }).errors?.retryAfterSeconds)
      : NaN;
  if (Number.isFinite(fromBody) && fromBody > 0) return Math.ceil(fromBody);
  const fromHeader = Number(err.response?.headers?.["retry-after"]);
  return Number.isFinite(fromHeader) && fromHeader > 0 ? Math.ceil(fromHeader) : undefined;
}

/** Returns the wait when `error` is a rate-limit rejection, otherwise null. */
export function getRateLimitInfo(error: unknown): RateLimitInfo | null {
  const e = (error ?? {}) as ErrorLike;
  const data = e.response?.data;
  const code = data && typeof data === "object" ? (data as { code?: unknown }).code : undefined;
  if (e.response?.status !== 429 && code !== "RATE_LIMITED") return null;
  return { retryAfterSeconds: readRetryAfterSeconds(e) ?? DEFAULT_RETRY_SECONDS };
}

export function startRateLimitCooldown(seconds: number, sessionKey: string = currentSessionKey()): void {
  const bounded = Math.min(Math.max(1, Math.ceil(seconds)), MAX_COOLDOWN_SECONDS);
  cooldownUntil.set(sessionKey, Math.max(cooldownUntil.get(sessionKey) ?? 0, Date.now() + bounded * 1000));
  listeners.forEach((l) => l());
}

export function rateLimitCooldownRemainingSeconds(sessionKey: string = currentSessionKey(), now: number = Date.now()): number {
  return Math.max(0, Math.ceil(((cooldownUntil.get(sessionKey) ?? 0) - now) / 1000));
}

/** Drop every cooldown (sign-in, sign-out, account switch). */
export function clearRateLimitCooldown(): void {
  cooldownUntil.clear();
  listeners.forEach((l) => l());
}

export function subscribeRateLimitCooldown(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test helper. */
export const resetRateLimitCooldown = clearRateLimitCooldown;

/** Error thrown locally while the cooldown is active (same shape the UI already understands). */
export function makeCooldownError(url: string | undefined, sessionKey: string = currentSessionKey()): Error & ErrorLike & { isRateLimitCooldown: true } {
  const remaining = Math.max(1, rateLimitCooldownRemainingSeconds(sessionKey));
  const err = new Error("Rate limit cooldown active") as Error & ErrorLike & { isRateLimitCooldown: true };
  err.isRateLimitCooldown = true;
  err.response = {
    status: 429,
    data: { success: false, code: "RATE_LIMITED", errors: { retryAfterSeconds: remaining }, path: url },
  };
  return err;
}

/** React Query `retry`: never auto-retry a client error (429 included); network/5xx get one retry. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  const status = (error as ErrorLike)?.response?.status;
  if (typeof status === "number" && status >= 400 && status < 500) return false;
  return failureCount < 1;
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** Localized "please wait" sentence for a rate-limit wait (seconds under 2 min, otherwise minutes). */
export function formatRateLimitMessage(seconds: number, t: Translate): string {
  return seconds >= 120
    ? t("common:rateLimited.messageMinutes", { count: Math.ceil(seconds / 60) })
    : t("common:rateLimited.message", { seconds: Math.max(1, Math.ceil(seconds)) });
}
