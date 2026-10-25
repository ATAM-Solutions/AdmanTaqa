import type { AdminPermissionPolicy, PermissionPolicyEntry, PolicyPermission } from "@/types/adminOrganization";

/**
 * Pure rules of the Job Title permission matrix (Super Admin). The BACKEND decides everything that matters
 * (identity of roles, the company administrator always eligible, whitelists); this only turns the API's answer into an
 * editable draft and the draft back into the smallest request — it never recomputes a verdict.
 */

/** Module display order (the backend returns modules in this order too; unknown modules sort last). */
export const MODULE_ORDER = [
  "maintenance_reports", "maintenance_approvals", "maintenance_decision", "internal_tasks", "work_orders", "external_maintenance",
  "warehouse", "assets", "provider_quotes", "provider_jobs", "provider_warehouse", "provider_commercial", "organization_team",
] as const;

export const moduleRank = (id: string): number => {
  const i = (MODULE_ORDER as readonly string[]).indexOf(id);
  return i === -1 ? MODULE_ORDER.length : i;
};

/** i18next reads "." as a path separator, so catalog codes are keyed with underscores. */
export const codeKey = (code: string): string => code.replace(/\./g, "_");

/** The tab exists for the platform Super Admin looking at a Fuel Station or Service Provider company. */
export function canShowPermissionPolicyTab(viewerOrganizationType: string | undefined, companyType: string | undefined): boolean {
  return viewerOrganizationType === "SUPER_ADMIN" && (companyType === "FUEL_STATION" || companyType === "SERVICE_PROVIDER");
}

export interface DraftEntry {
  /** `false` = platform default: every Job Title keeps what it has and the permission is not grantable per person. */
  restricted: boolean;
  /** Names of the Job Titles that may hold it (meaningful only while `restricted`). */
  eligible: string[];
}
export type PolicyDraft = Record<string, DraftEntry>;

/** Only permissions edited here (asset creation lives in its own tab). */
export const isEditable = (p: PolicyPermission): boolean => p.managedBy === "permission_policy";

export function buildDraft(policy: AdminPermissionPolicy): PolicyDraft {
  const draft: PolicyDraft = {};
  for (const m of policy.modules) {
    for (const p of m.permissions) {
      if (!isEditable(p)) continue;
      draft[p.code] = { restricted: p.restricted, eligible: [...(p.eligibleRoleNames ?? [])] };
    }
  }
  return draft;
}

/**
 * Switching a restriction ON preselects the Job Titles that hold the permission today, so nobody loses it by surprise
 * (the company administrator is added by the backend). Switching it OFF returns to the platform default.
 */
export function toggleRestricted(draft: PolicyDraft, perm: PolicyPermission, on: boolean): PolicyDraft {
  const current = draft[perm.code] ?? { restricted: false, eligible: [] };
  return {
    ...draft,
    [perm.code]: on
      ? { restricted: true, eligible: current.eligible.length > 0 ? current.eligible : [...perm.holdingRoleNames] }
      : { restricted: false, eligible: current.eligible },
  };
}

export function toggleRole(draft: PolicyDraft, code: string, roleName: string, on: boolean): PolicyDraft {
  const current = draft[code] ?? { restricted: true, eligible: [] };
  const set = new Set(current.eligible);
  if (on) set.add(roleName);
  else set.delete(roleName);
  return { ...draft, [code]: { ...current, eligible: [...set] } };
}

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));

/** The smallest request: only permissions whose draft differs from what the API reported. */
export function diffDraft(policy: AdminPermissionPolicy, draft: PolicyDraft): PermissionPolicyEntry[] {
  const out: PermissionPolicyEntry[] = [];
  for (const m of policy.modules) {
    for (const p of m.permissions) {
      if (!isEditable(p)) continue;
      const d = draft[p.code];
      if (!d) continue;
      const adminNames = policy.roles.filter((r) => r.isCompanyAdmin).map((r) => r.name);
      const baseline = p.restricted ? (p.eligibleRoleNames ?? []) : [];
      const wanted = d.restricted ? [...new Set([...d.eligible, ...adminNames])] : [];
      const changed = d.restricted !== p.restricted || (d.restricted && !sameSet(wanted, baseline));
      if (changed) out.push({ code: p.code, restricted: d.restricted, allowedRoleNames: d.restricted ? d.eligible.filter((n) => !adminNames.includes(n)) : [] });
    }
  }
  return out;
}

/** Holds today but would lose it by this draft (to warn before saving). */
export function losers(policy: AdminPermissionPolicy, draft: PolicyDraft): { code: string; roleName: string }[] {
  const out: { code: string; roleName: string }[] = [];
  for (const m of policy.modules) {
    for (const p of m.permissions) {
      const d = draft[p.code];
      if (!isEditable(p) || !d?.restricted) continue;
      const adminNames = policy.roles.filter((r) => r.isCompanyAdmin).map((r) => r.name);
      for (const name of p.holdingRoleNames) {
        if (!d.eligible.includes(name) && !adminNames.includes(name)) out.push({ code: p.code, roleName: name });
      }
    }
  }
  return out;
}

export type PermissionPolicyErrorKind = "unknownRole" | "unknownCode" | "assetManaged" | "schemaNotReady" | "forbidden" | "notFound" | "network" | "server";
export interface PermissionPolicyError {
  kind: PermissionPolicyErrorKind;
  names: string[];
}
interface HttpErrorShape {
  response?: { status?: number; data?: { code?: string; errors?: { unknownRoleNames?: unknown } } };
}
/** Classify by the stable `code` / status — never by the English message. */
export function classifyPermissionPolicyError(error: unknown): PermissionPolicyError {
  const res = (error as HttpErrorShape | null)?.response;
  if (!res) return { kind: "network", names: [] };
  const code = res.data?.code;
  if (code === "PERMISSION_POLICY_UNKNOWN_ROLE") {
    const raw = res.data?.errors?.unknownRoleNames;
    return { kind: "unknownRole", names: Array.isArray(raw) ? raw.filter((n): n is string => typeof n === "string") : [] };
  }
  if (code === "PERMISSION_POLICY_UNKNOWN_CODE") return { kind: "unknownCode", names: [] };
  if (code === "MANAGED_BY_ASSET_POLICY") return { kind: "assetManaged", names: [] };
  if (code === "SCHEMA_NOT_READY" || (res.status === 503 && code == null)) return { kind: "schemaNotReady", names: [] };
  if (res.status === 401 || res.status === 403) return { kind: "forbidden", names: [] };
  if (res.status === 404) return { kind: "notFound", names: [] };
  return { kind: "server", names: [] };
}
