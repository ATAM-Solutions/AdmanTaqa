import type { AdminAssetPolicy, AssetPolicyRole, SetAssetPolicyBody } from "@/types/adminOrganization";

/**
 * Pure helpers for the Super Admin "Asset permissions" tab.
 *
 * The BACKEND decides who may create assets (identity-based eligibility, ceiling over roles and per-user overrides).
 * Nothing here recomputes that: the draft only describes what the Super Admin wants to SAVE, and every
 * "eligible" / "holdsAssetCreate" value shown comes from the API response.
 */

/** What the editor holds before saving. `allowed` is a set of role NAMES, exactly the shape the PUT API takes. */
export interface PolicyDraft {
  restricted: boolean;
  allowed: ReadonlySet<string>;
}

/** The tab exists for the platform Super Admin looking at a Fuel Station company (the backend refuses anything else). */
export function canShowAssetPolicyTab(viewerOrganizationType: string | undefined, companyType: string | undefined): boolean {
  return viewerOrganizationType === "SUPER_ADMIN" && companyType === "FUEL_STATION";
}

/**
 * Names to preselect when restriction is (first) switched on:
 *  - a company that already has a saved list keeps it (nothing the Super Admin chose earlier is discarded);
 *  - otherwise the roles that currently grant Create Assets, so switching the restriction on removes nobody by surprise.
 */
export function seedAllowedNames(policy: AdminAssetPolicy): string[] {
  if (policy.hasPolicy && policy.allowedRoleNames.length > 0) {
    const known = new Set(policy.roles.map((r) => r.name));
    return policy.allowedRoleNames.filter((n) => known.has(n));
  }
  return policy.roles.filter((r) => r.holdsAssetCreate).map((r) => r.name);
}

/** The draft that mirrors what is saved (nothing edited yet). */
export function draftFromPolicy(policy: AdminAssetPolicy): PolicyDraft {
  if (policy.restricted) {
    return { restricted: true, allowed: new Set(policy.roles.filter((r) => r.eligible).map((r) => r.name)) };
  }
  // unrestricted: the preselection waits, invisible, for the moment restriction is switched on
  return { restricted: false, allowed: new Set(seedAllowedNames(policy)) };
}

export function setRestricted(draft: PolicyDraft, restricted: boolean): PolicyDraft {
  return { ...draft, restricted };
}

export function toggleRole(draft: PolicyDraft, roleName: string, allowed: boolean): PolicyDraft {
  const next = new Set(draft.allowed);
  if (allowed) next.add(roleName);
  else next.delete(roleName);
  return { ...draft, allowed: next };
}

const sameSet = (a: ReadonlySet<string>, b: ReadonlySet<string>) => a.size === b.size && [...a].every((x) => b.has(x));

/** Is there anything to save? While unrestricted the selection is irrelevant (everyone keeps what they have). */
export function isDirty(policy: AdminAssetPolicy, draft: PolicyDraft): boolean {
  if (draft.restricted !== policy.restricted) return true;
  if (!draft.restricted) return false;
  return !sameSet(draft.allowed, draftFromPolicy(policy).allowed);
}

/** The company administrator role is left out of a restricted policy: it could no longer create assets or delegate that. */
export function excludesCompanyAdmin(policy: AdminAssetPolicy, draft: PolicyDraft): AssetPolicyRole | null {
  if (!draft.restricted) return null;
  const admin = policy.roles.find((r) => r.isCompanyAdmin);
  return admin && !draft.allowed.has(admin.name) ? admin : null;
}

/**
 * Roles that can create assets today (as reported by the API) and would stop being eligible with this draft:
 *  - restricted → restricted: roles currently eligible and now unchecked;
 *  - unrestricted → restricted: roles that currently grant Create Assets and are left unchecked.
 */
export function rolesLosingEligibility(policy: AdminAssetPolicy, draft: PolicyDraft): AssetPolicyRole[] {
  if (!draft.restricted) return [];
  return policy.roles.filter((r) => {
    if (draft.allowed.has(r.name)) return false;
    return policy.restricted ? r.eligible : r.holdsAssetCreate;
  });
}

/** Does saving need an explicit confirmation? (someone loses eligibility, the administrator is excluded, or nobody is left) */
export function needsConfirmation(policy: AdminAssetPolicy, draft: PolicyDraft): boolean {
  if (!draft.restricted) return false;
  return rolesLosingEligibility(policy, draft).length > 0 || excludesCompanyAdmin(policy, draft) != null || draft.allowed.size === 0;
}

/** The PUT body: only roles that exist today (stale references are dropped by saving), in the API's own order. */
export function buildSaveBody(policy: AdminAssetPolicy, draft: PolicyDraft): SetAssetPolicyBody {
  return {
    restricted: draft.restricted,
    allowedRoleNames: policy.roles.filter((r) => draft.allowed.has(r.name)).map((r) => r.name),
  };
}

export function hasStaleReferences(policy: AdminAssetPolicy): boolean {
  return policy.staleRoleNames.length > 0 || policy.staleRoleIds.length > 0;
}

// ── errors ───────────────────────────────────────────────────────────────────────────────────────────────────────

export type AssetPolicyErrorKind =
  | "unknownRole"
  | "notSupported"
  | "forbidden"
  | "notFound"
  | "schemaNotReady"
  | "network"
  | "server";

export interface AssetPolicyError {
  kind: AssetPolicyErrorKind;
  /** Role names the API rejected (ASSET_POLICY_UNKNOWN_ROLE). */
  unknownRoleNames: string[];
}

interface HttpErrorShape {
  response?: { status?: number; data?: { code?: string; errors?: { unknownRoleNames?: unknown } | null } };
}

/** Classify an API failure by its stable `code` / status — never by the (English) message text. */
export function classifyAssetPolicyError(error: unknown): AssetPolicyError {
  const res = (error as HttpErrorShape | null)?.response;
  if (!res) return { kind: "network", unknownRoleNames: [] };
  const code = res.data?.code;
  const status = res.status;
  if (code === "ASSET_POLICY_UNKNOWN_ROLE") {
    const raw = res.data?.errors?.unknownRoleNames;
    return { kind: "unknownRole", unknownRoleNames: Array.isArray(raw) ? raw.filter((n): n is string => typeof n === "string") : [] };
  }
  if (code === "ASSET_POLICY_NOT_SUPPORTED") return { kind: "notSupported", unknownRoleNames: [] };
  if (code === "SCHEMA_NOT_READY" || (status === 503 && code == null)) return { kind: "schemaNotReady", unknownRoleNames: [] };
  if (status === 401 || status === 403) return { kind: "forbidden", unknownRoleNames: [] };
  if (status === 404) return { kind: "notFound", unknownRoleNames: [] };
  return { kind: "server", unknownRoleNames: [] };
}
