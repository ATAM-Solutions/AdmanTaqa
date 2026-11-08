/**
 * Manager-confirmed manual check-in: when does the Provider Manager's action appear, and how are its failures explained.
 * The server decides everything that matters (permissions, the assigned operator, the job and visit, the reason); this only
 * makes sure the button is never offered when the server would refuse it.
 */

/** Job states in which the server accepts a check-in. */
export const MANUAL_ELIGIBLE_JOB_STATUSES = ["ACTIVE", "IN_PROGRESS", "WAITING_PARTS"] as const;
export const MIN_MANUAL_REASON = 3;

export interface ManualVisit { id: number; status?: string; visitDate?: string }
export interface ManualOperator { id: number; name: string }

export type ManualCheckinState =
  | { kind: "hidden" }
  /** allowed, but the operator has not opened a visit yet (a manager never creates the visit: the operator starts the work) */
  | { kind: "needsVisit" }
  | { kind: "available"; visit: ManualVisit; operators: ManualOperator[] };

export function manualCheckinState(input: {
  hasManualPermission: boolean;
  hasAssignPermission: boolean;
  viewerIsAssigned: boolean;
  operators: ManualOperator[];
  status: string;
  visits: ManualVisit[];
}): ManualCheckinState {
  const { hasManualPermission, hasAssignPermission, viewerIsAssigned, operators, status, visits } = input;
  // both keys, exactly like the server: manual_checkin (the explicit permission) + assign_operator (a manager-level key)
  if (!hasManualPermission || !hasAssignPermission) return { kind: "hidden" };
  // the assigned operator uses their own controls; nobody is confirmed on a job nobody is assigned to
  if (viewerIsAssigned || operators.length === 0) return { kind: "hidden" };
  if (!(MANUAL_ELIGIBLE_JOB_STATUSES as readonly string[]).includes(status)) return { kind: "hidden" };
  if (visits.some((v) => v.status === "CHECKED_IN")) return { kind: "hidden" };
  const visit = visits.find((v) => v.status === "DRAFT" || v.status === "SCHEDULED");
  return visit ? { kind: "available", visit, operators } : { kind: "needsVisit" };
}

export const isValidManualReason = (reason: string) => reason.trim().length >= MIN_MANUAL_REASON;

const KNOWN_CODES = [
  "MANUAL_REASON_REQUIRED", "MANUAL_TARGET_REQUIRED", "VISIT_JOB_MISMATCH", "OPERATOR_NOT_ASSIGNED_TO_JOB",
  "NO_ASSIGNED_OPERATOR", "NOT_ASSIGNED_OPERATOR", "VISIT_ALREADY_CHECKED_IN",
] as const;
export type ManualErrorKey = (typeof KNOWN_CODES)[number] | "alreadyCheckedIn" | "forbidden" | "generic";

/** Translation key (under `manual.errors.`) for a failed manual check-in. */
export function manualErrorKey(e: unknown): ManualErrorKey {
  const r = (e as { response?: { status?: number; data?: { code?: string; message?: string } } })?.response;
  const code = r?.data?.code;
  if (code && (KNOWN_CODES as readonly string[]).includes(code)) return code as ManualErrorKey;
  // the visit was already checked in (plain 409 "Transition from CHECKED_IN to CHECKED_IN")
  if (r?.status === 409 && /CHECKED_IN to CHECKED_IN/.test(r.data?.message ?? "")) return "alreadyCheckedIn";
  if (r?.status === 403) return "forbidden";
  return "generic";
}
