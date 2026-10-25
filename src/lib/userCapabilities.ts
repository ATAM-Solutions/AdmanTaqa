import type { CapabilityEffect, CapabilityState } from "@/api/services/warehouseService";
import { COMPANY_ADMIN_ROLE_NAMES } from "@/lib/company";
import { moduleRank } from "@/lib/permissionPolicy";

/**
 * Pure rules for the per-user "individual permissions" card.
 * The BACKEND is the authority (role grants, Super Admin eligibility, hierarchy, self/protected guards); nothing here
 * recomputes a verdict — the UI reads `effective` / `eligible` from the API and only decides what to SHOW and which
 * requests are worth sending. A request the backend would refuse anyway is simply not offered.
 */

/**
 * Every delegable capability the API reports, grouped by module in the platform's display order. Unknown codes/modules
 * from the API are still shown (with the code as its label) — the card never hides what the server returned.
 */
export interface CapabilityGroup {
  module: string;
  items: CapabilityState[];
}

export function groupCapabilities(list: readonly CapabilityState[]): CapabilityGroup[] {
  const groups = new Map<string, CapabilityState[]>();
  for (const c of list) {
    const module = c.module ?? "other";
    groups.set(module, [...(groups.get(module) ?? []), c]);
  }
  return [...groups.entries()]
    .map(([module, items]) => ({ module, items }))
    .sort((a, b) => moduleRank(a.module) - moduleRank(b.module));
}

/** What a filter shows: allowed = effective now; unavailable = cannot be granted to this person; available = the rest. */
export type CapabilityFilter = "all" | "allowed" | "available" | "unavailable";
export function matchesFilter(cap: CapabilityState, filter: CapabilityFilter): boolean {
  if (filter === "all") return true;
  if (filter === "allowed") return cap.effective;
  const unavailable = cap.eligible === false;
  return filter === "unavailable" ? unavailable : !unavailable && !cap.effective;
}

/** A module starts expanded when something in it is individually set or can still be allowed. */
export const shouldOpenModule = (items: readonly CapabilityState[]): boolean => items.some((c) => c.override != null || c.eligible !== false);

/** Kept for callers that only need the flat, ordered list (module order, then API order). */
export function visibleCapabilities(list: readonly CapabilityState[]): CapabilityState[] {
  return groupCapabilities(list).flatMap((g) => g.items);
}

export type EditMode = "hidden" | "readonly" | "edit";
export type ReadonlyReason = "self" | "protected" | null;

export interface EditContext {
  viewerHasAssignRoles: boolean;
  viewerOrganizationType: string | undefined;
  viewerUserId: number | string | null | undefined;
  targetUserId: number | string;
  targetRoleNames: readonly string[] | undefined;
}

/**
 * hidden   — the viewer may not manage capabilities at all (no `team.assign_roles`, or not a Fuel Station): nothing is rendered or requested.
 * readonly — the viewer may look but not edit: their own account, or the company administrator (protected). The backend
 *            refuses both (403) — we just don't offer the buttons.
 * edit     — controls shown.
 * (Protection by `team.assign_roles` on a renamed role can't be seen from the user's role names; the backend still answers
 * 403 PROTECTED_USER_CAPABILITY_FORBIDDEN and the card then locks itself — see `classifyCapabilityError`.)
 */
export function editMode(ctx: EditContext): { mode: EditMode; reason: ReadonlyReason } {
  const company = ctx.viewerOrganizationType === "FUEL_STATION" || ctx.viewerOrganizationType === "SERVICE_PROVIDER";
  if (!ctx.viewerHasAssignRoles || !company) return { mode: "hidden", reason: null };
  if (ctx.viewerUserId != null && String(ctx.viewerUserId) === String(ctx.targetUserId)) return { mode: "readonly", reason: "self" };
  const adminNames = Object.values(COMPANY_ADMIN_ROLE_NAMES).map((n) => n.toLowerCase());
  if ((ctx.targetRoleNames ?? []).some((n) => adminNames.includes(n.trim().toLowerCase()))) return { mode: "readonly", reason: "protected" };
  return { mode: "edit", reason: null };
}

export type RoleSource = "role" | "none";
export type OverrideState = "grant" | "deny" | "none";

/** Why a permission cannot be granted to this person right now (null = it can, or it is already held). */
export type UnavailableReason = "notEligible" | "noJobTitle" | "notGrantable" | "notWhitelisted" | "unverifiable" | null;

export interface RowView {
  code: string;
  effective: boolean;
  reason: UnavailableReason;
  /** Platform (Super Admin) restriction applies to this person's role. */
  restricted: boolean;
  /** The restriction cannot be checked right now (treated as restricted for granting). */
  unverifiable: boolean;
  inheritedFromRole: boolean;
  override: OverrideState;
  /** Which buttons are offered (never GRANT when the platform disallows or cannot verify). */
  canGrant: boolean;
  canDeny: boolean;
  canReset: boolean;
}

export function describeRow(cap: CapabilityState): RowView {
  const unverifiable = cap.eligibilityReason === "POLICY_UNAVAILABLE";
  const restricted = cap.eligible === false && !unverifiable;
  const blocked = cap.eligible === false;
  const reason: UnavailableReason = !blocked
    ? null
    : unverifiable
      ? "unverifiable"
      : cap.eligibilityReason === "NO_JOB_TITLE"
        ? "noJobTitle"
        : cap.eligibilityReason === "NOT_GRANTABLE"
          ? "notGrantable"
          : cap.eligibilityReason === "NOT_WHITELISTED"
            ? "notWhitelisted"
            : "notEligible";
  const override: OverrideState = cap.override === "GRANT" ? "grant" : cap.override === "DENY" ? "deny" : "none";
  return {
    code: cap.code,
    effective: cap.effective,
    reason,
    restricted,
    unverifiable,
    inheritedFromRole: cap.byRole,
    override,
    canGrant: !blocked && override !== "grant",
    // tightening is always allowed by the backend, even for a role the platform has restricted
    canDeny: override !== "deny",
    canReset: override !== "none",
  };
}

// ── errors ───────────────────────────────────────────────────────────────────────────────────────────────────────

export type CapabilityErrorKind =
  | "selfChange"
  | "protectedUser"
  | "roleNotEligible"
  | "noJobTitle"
  | "notGrantable"
  | "unavailable"
  | "notDelegable"
  | "forbidden"
  | "notFound"
  | "network"
  | "server";

interface ErrorLike {
  code?: string | null;
  status?: number | null;
  response?: { status?: number; data?: { code?: string } };
}

/** Classify by the stable `code` / status — never by the English message. Understands WarehouseApiError and raw axios errors. */
export function classifyCapabilityError(error: unknown): CapabilityErrorKind {
  const e = (error ?? {}) as ErrorLike;
  const code = e.code ?? e.response?.data?.code ?? null;
  const status = e.status ?? e.response?.status ?? null;
  if (code === "CAPABILITY_SELF_CHANGE_FORBIDDEN") return "selfChange";
  if (code === "PROTECTED_USER_CAPABILITY_FORBIDDEN") return "protectedUser";
  if (code === "ROLE_NOT_ELIGIBLE") return "roleNotEligible";
  if (code === "NO_JOB_TITLE") return "noJobTitle";
  if (code === "CAPABILITY_NOT_GRANTABLE") return "notGrantable";
  if (code === "PERMISSION_OVERRIDES_UNAVAILABLE" || status === 503) return "unavailable";
  if (code === "CAPABILITY_NOT_DELEGABLE") return "notDelegable";
  if (status === 401 || status === 403) return "forbidden";
  if (status === 404) return "notFound";
  if (status == null) return "network";
  return "server";
}

/** Errors that mean this person can never be edited by this viewer: lock the card instead of inviting retries. */
export const isLockingError = (kind: CapabilityErrorKind): boolean => kind === "selfChange" || kind === "protectedUser";

/** Cache key of one person's capabilities: carries the VIEWER's company, so nothing is ever shared across companies. */
export const capabilityQueryKey = (viewerOrganizationId: number | null | undefined, targetUserId: number | string) =>
  ["user-capabilities", viewerOrganizationId ?? null, String(targetUserId)] as const;

export const EFFECTS: readonly CapabilityEffect[] = ["GRANT", "DENY", "DEFAULT"];
