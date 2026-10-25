import type { AssignmentImpact, PolicyChange } from "@/api/services/warehouseAdminService";

type Activation = Extract<PolicyChange, { enabled: true }>;

/** Server error codes of the assignment endpoints that have their own translated message (`warehouse:mgmt.errors.*`). */
export const ASSIGNMENT_ERROR_CODES = [
  "USER_NOT_WAREHOUSE_ROLE", "USER_INACTIVE", "USER_NOT_FOUND", "STATION_NOT_FOUND", "ALREADY_HOME_STATION", "WAREHOUSE_NOT_FOUND",
  "WAREHOUSE_NOT_ASSIGNED", "WAREHOUSE_ADMIN_REQUIRED", "ASSIGNMENT_ACTIVATION_BLOCKED", "ASSIGNMENT_IMPACT_CONFIRMATION_REQUIRED", "COMPANY_ADMIN_REQUIRED",
] as const;

export function assignmentErrorKey(code: string | null | undefined): string | null {
  return code && (ASSIGNMENT_ERROR_CODES as readonly string[]).includes(code) ? `mgmt.errors.${code}` : null;
}

/** The activation request for the impact the administrator is looking at: the exact unassigned count is echoed back as the confirmation. */
export function activationChange(impact: AssignmentImpact, confirmed: boolean): Activation {
  return { enabled: true, confirmImpact: confirmed, expectedUnassignedManagers: impact.managersWithoutAssignment.length };
}

/** The confirmation checkbox is required exactly when the server will ask for it. */
export function needsImpactConfirmation(impact: AssignmentImpact): boolean {
  return impact.requiresConfirmation;
}

/** Stations a warehouse serves, home first, for display. */
export function servedStationIds(homeBranchId: number | null, linkedBranchIds: number[]): number[] {
  return [...new Set([...(homeBranchId != null ? [homeBranchId] : []), ...linkedBranchIds])];
}
