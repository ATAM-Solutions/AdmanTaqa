/**
 * Classifies a failed auth request into a small set of kinds the UI can translate.
 *
 * Decisions are made from machine-readable signals only — HTTP status and the backend's stable
 * `code` field — never by matching English message text. A request with NO usable JSON body
 * (network drop, CORS failure, proxy HTML error page, a plain-text 429) is the situation that
 * used to surface as the generic English "An error occurred during login".
 */
export type AuthErrorKind =
  | "invalid_credentials"
  | "account_inactive"
  | "organization_inactive"
  | "rate_limited"
  | "network"
  | "server"
  | "unknown";

export interface ClassifiedAuthError {
  kind: AuthErrorKind;
  /** Seconds the client should wait (rate_limited only, when the server said so). */
  retryAfterSeconds?: number;
}

type ErrorLike = {
  response?: { status?: number; data?: unknown; headers?: Record<string, unknown> };
  code?: string;
  request?: unknown;
};

function readCode(data: unknown): string | undefined {
  if (data && typeof data === "object" && "code" in data) {
    const code = (data as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

function readRetryAfter(err: ErrorLike): number | undefined {
  const data = err.response?.data;
  const fromBody =
    data && typeof data === "object" && "errors" in data
      ? Number((data as { errors?: { retryAfterSeconds?: unknown } }).errors?.retryAfterSeconds)
      : NaN;
  if (Number.isFinite(fromBody) && fromBody > 0) return Math.ceil(fromBody);
  const header = err.response?.headers?.["retry-after"];
  const fromHeader = Number(header);
  return Number.isFinite(fromHeader) && fromHeader > 0 ? Math.ceil(fromHeader) : undefined;
}

export function classifyAuthError(err: unknown): ClassifiedAuthError {
  const e = (err ?? {}) as ErrorLike;
  const status = e.response?.status;
  const code = readCode(e.response?.data);

  if (status === undefined) {
    // No HTTP response at all: offline, DNS, CORS, aborted.
    return { kind: "network" };
  }
  if (status === 429 || code === "RATE_LIMITED") {
    return { kind: "rate_limited", retryAfterSeconds: readRetryAfter(e) };
  }
  if (code === "ACCOUNT_INACTIVE") return { kind: "account_inactive" };
  if (code === "ORGANIZATION_INACTIVE") return { kind: "organization_inactive" };
  if (code === "INVALID_CREDENTIALS") return { kind: "invalid_credentials" };
  // A 401 from the login endpoint can only mean the credentials were not accepted
  // (older backends do not send a code).
  if (status === 401 || status === 400) return { kind: "invalid_credentials" };
  if (status >= 500) return { kind: "server" };
  return { kind: "unknown" };
}

/** Rounds a wait up to whole minutes for display ("try again in N minutes"). */
export function retryAfterMinutes(seconds: number | undefined): number | undefined {
  if (!seconds || seconds <= 0) return undefined;
  return Math.max(1, Math.ceil(seconds / 60));
}
