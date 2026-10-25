import { describe, expect, it, vi } from "vitest";
import {
  buildSaveBody,
  canShowAssetPolicyTab,
  classifyAssetPolicyError,
  draftFromPolicy,
  excludesCompanyAdmin,
  hasStaleReferences,
  isDirty,
  needsConfirmation,
  rolesLosingEligibility,
  seedAllowedNames,
  setRestricted,
  toggleRole,
} from "./assetPolicy";
import type { AdminAssetPolicy, AssetPolicyRole } from "@/types/adminOrganization";

const role = (id: number, name: string, extra: Partial<AssetPolicyRole> = {}): AssetPolicyRole => ({
  id, name, isSystem: false, isCompanyAdmin: false, holdsAssetCreate: false, eligible: true, ...extra,
});

/** A company with no saved policy: the owner, a manager and a warehouse manager hold Create Assets today. */
const fresh = (over: Partial<AdminAssetPolicy> = {}): AdminAssetPolicy => ({
  organizationId: 7, organizationType: "FUEL_STATION", restricted: false, allowedRoleNames: [], staleRoleNames: [], staleRoleIds: [],
  hasPolicy: false, updatedAt: null, updatedByUserId: null,
  roles: [
    role(1, "Station Owner", { isCompanyAdmin: true, holdsAssetCreate: true }),
    role(2, "Station Manager", { holdsAssetCreate: true }),
    role(3, "Technician"),
    role(4, "Warehouse Manager", { holdsAssetCreate: true, isSystem: true }),
  ],
  ...over,
});

/** The same company with a saved, restricted policy allowing the owner and the manager. */
const restricted = (over: Partial<AdminAssetPolicy> = {}): AdminAssetPolicy => {
  const base = fresh();
  return {
    ...base, restricted: true, hasPolicy: true, allowedRoleNames: ["Station Owner", "Station Manager"], updatedAt: "2026-10-01T10:00:00.000Z",
    roles: base.roles.map((r) => ({ ...r, eligible: r.name === "Station Owner" || r.name === "Station Manager" })),
    ...over,
  };
};

describe("tab visibility", () => {
  it("only the platform Super Admin, and only for a Fuel Station company", () => {
    expect(canShowAssetPolicyTab("SUPER_ADMIN", "FUEL_STATION")).toBe(true);
    expect(canShowAssetPolicyTab("SUPER_ADMIN", "SERVICE_PROVIDER")).toBe(false);
    expect(canShowAssetPolicyTab("SUPER_ADMIN", undefined)).toBe(false);
    for (const viewer of ["AUTHORITY", "FUEL_STATION", "SERVICE_PROVIDER", undefined]) {
      expect(canShowAssetPolicyTab(viewer, "FUEL_STATION"), String(viewer)).toBe(false);
    }
  });
});

describe("initial state", () => {
  it("unrestricted: nothing is dirty, nobody is excluded, nothing needs confirming", () => {
    const p = fresh();
    const d = draftFromPolicy(p);
    expect(d.restricted).toBe(false);
    expect(isDirty(p, d)).toBe(false);
    expect(rolesLosingEligibility(p, d)).toEqual([]);
    expect(needsConfirmation(p, d)).toBe(false);
    expect(excludesCompanyAdmin(p, d)).toBeNull();
  });

  it("existing restricted policy mirrors the API's own `eligible` verdict", () => {
    const p = restricted();
    const d = draftFromPolicy(p);
    expect(d.restricted).toBe(true);
    expect([...d.allowed].sort()).toEqual(["Station Manager", "Station Owner"]);
    expect(isDirty(p, d)).toBe(false);
  });

  it("never treats a role as allowed because it shares a NAME with an allowed one — only the API's `eligible` counts", () => {
    // the policy lists the shared template "Technician", but THIS company's Technician role is not eligible
    const p = restricted({
      allowedRoleNames: ["Station Owner", "Technician"],
      roles: [role(1, "Station Owner", { isCompanyAdmin: true, eligible: true }), role(3, "Technician", { eligible: false })],
    });
    expect([...draftFromPolicy(p).allowed]).toEqual(["Station Owner"]);
  });
});

describe("first activation of the restriction", () => {
  it("preselects the roles that hold Create Assets today, but saves nothing", () => {
    const p = fresh();
    expect(seedAllowedNames(p)).toEqual(["Station Owner", "Station Manager", "Warehouse Manager"]);
    const d = setRestricted(draftFromPolicy(p), true);
    expect([...d.allowed]).toEqual(["Station Owner", "Station Manager", "Warehouse Manager"]);
    expect(isDirty(p, d)).toBe(true); // pending, until the Super Admin saves
    expect(rolesLosingEligibility(p, d)).toEqual([]); // nobody loses access with the preselection
    expect(needsConfirmation(p, d)).toBe(false);
    expect(buildSaveBody(p, d)).toEqual({ restricted: true, allowedRoleNames: ["Station Owner", "Station Manager", "Warehouse Manager"] });
  });

  it("a company that already saved a list (restriction later switched off) gets that list back, not a reseed", () => {
    const p = fresh({ hasPolicy: true, allowedRoleNames: ["Station Owner"], roles: fresh().roles });
    expect(seedAllowedNames(p)).toEqual(["Station Owner"]);
  });

  it("switching on then off again is not a change", () => {
    const p = fresh();
    const d = setRestricted(setRestricted(draftFromPolicy(p), true), false);
    expect(isDirty(p, d)).toBe(false);
  });
});

describe("editing a restricted policy", () => {
  it("selecting and deselecting roles; reverting an edit clears the unsaved state", () => {
    const p = restricted();
    let d = draftFromPolicy(p);
    d = toggleRole(d, "Technician", true);
    expect(isDirty(p, d)).toBe(true);
    expect(buildSaveBody(p, d).allowedRoleNames).toEqual(["Station Owner", "Station Manager", "Technician"]);
    d = toggleRole(d, "Technician", false);
    expect(isDirty(p, d)).toBe(false);
  });

  it("deselecting an eligible role asks for confirmation and names it", () => {
    const p = restricted();
    const d = toggleRole(draftFromPolicy(p), "Station Manager", false);
    expect(rolesLosingEligibility(p, d).map((r) => r.name)).toEqual(["Station Manager"]);
    expect(needsConfirmation(p, d)).toBe(true);
  });

  it("adding a role never needs confirmation", () => {
    const p = restricted();
    expect(needsConfirmation(p, toggleRole(draftFromPolicy(p), "Technician", true))).toBe(false);
  });

  it("excluding the company administrator is flagged and needs confirmation", () => {
    const p = restricted();
    const d = toggleRole(draftFromPolicy(p), "Station Owner", false);
    expect(excludesCompanyAdmin(p, d)?.name).toBe("Station Owner");
    expect(needsConfirmation(p, d)).toBe(true);
    expect(excludesCompanyAdmin(p, toggleRole(d, "Station Owner", true))).toBeNull();
  });

  it("an empty selection needs confirmation (nobody could create assets)", () => {
    const p = restricted();
    const d = { restricted: true, allowed: new Set<string>() };
    expect(needsConfirmation(p, d)).toBe(true);
    expect(buildSaveBody(p, d).allowedRoleNames).toEqual([]);
  });

  it("lifting the restriction loses nobody and needs no confirmation; the saved list is kept for later", () => {
    const p = restricted();
    const d = setRestricted(draftFromPolicy(p), false);
    expect(isDirty(p, d)).toBe(true);
    expect(rolesLosingEligibility(p, d)).toEqual([]);
    expect(needsConfirmation(p, d)).toBe(false);
    expect(buildSaveBody(p, d)).toEqual({ restricted: false, allowedRoleNames: ["Station Owner", "Station Manager"] });
  });

  it("a role that is eligible but does not grant Create Assets is still listed when removed", () => {
    const p = restricted();
    const d = toggleRole(draftFromPolicy(p), "Station Manager", false);
    expect(rolesLosingEligibility(p, d)[0].holdsAssetCreate).toBe(true);
  });
});

describe("stale references", () => {
  it("are detected and dropped from the save body (a save cleans them up)", () => {
    const p = restricted({ staleRoleNames: ["Old Shared Role"], staleRoleIds: [99, 100] });
    expect(hasStaleReferences(p)).toBe(true);
    expect(hasStaleReferences(restricted())).toBe(false);
    const body = buildSaveBody(p, toggleRole(draftFromPolicy(p), "Old Shared Role", true));
    expect(body.allowedRoleNames).not.toContain("Old Shared Role");
  });
});

describe("no cross-company leakage", () => {
  it("drafts are derived per policy object: company B never inherits company A's edits", () => {
    const a = restricted({ organizationId: 1 });
    const b = fresh({ organizationId: 2 });
    const editedA = toggleRole(draftFromPolicy(a), "Technician", true);
    expect(editedA.allowed.has("Technician")).toBe(true);
    expect(draftFromPolicy(b).allowed.has("Technician")).toBe(false);
    expect(draftFromPolicy(b).restricted).toBe(false);
  });
});

describe("error classification (by stable code/status, never by message)", () => {
  const http = (status: number, code?: string, errors?: unknown) => ({ response: { status, data: { code, errors, message: "irrelevant english text" } } });
  it("maps every handled failure", () => {
    expect(classifyAssetPolicyError(http(400, "ASSET_POLICY_UNKNOWN_ROLE", { unknownRoleNames: ["Ghost", 5] }))).toEqual({ kind: "unknownRole", unknownRoleNames: ["Ghost"] });
    expect(classifyAssetPolicyError(http(400, "ASSET_POLICY_NOT_SUPPORTED")).kind).toBe("notSupported");
    expect(classifyAssetPolicyError(http(403)).kind).toBe("forbidden");
    expect(classifyAssetPolicyError(http(401)).kind).toBe("forbidden");
    expect(classifyAssetPolicyError(http(404)).kind).toBe("notFound");
    expect(classifyAssetPolicyError(http(503, "SCHEMA_NOT_READY")).kind).toBe("schemaNotReady");
    expect(classifyAssetPolicyError(http(503)).kind).toBe("schemaNotReady");
    expect(classifyAssetPolicyError(http(500)).kind).toBe("server");
    expect(classifyAssetPolicyError(http(503, "PERMISSION_OVERRIDES_UNAVAILABLE")).kind).toBe("server");
    expect(classifyAssetPolicyError(new Error("Network Error")).kind).toBe("network");
    expect(classifyAssetPolicyError(undefined).kind).toBe("network");
  });
});

describe("API wiring", () => {
  it("GET/PUT go to the company's own asset-policy URL and return the unwrapped body", async () => {
    vi.resetModules();
    const get = vi.fn(async () => ({ data: { success: true, data: fresh() } }));
    const put = vi.fn(async () => ({ data: { success: true, data: restricted() } }));
    vi.doMock("@/api/config", () => ({ default: { get, put, post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
    const { adminOrganizationsService } = await import("@/api/services/adminOrganizationsService");
    expect((await adminOrganizationsService.getAssetPolicy(7)).organizationId).toBe(7);
    expect(get).toHaveBeenCalledWith("admin/organizations/7/asset-policy");
    const body = { restricted: true, allowedRoleNames: ["Station Owner"] };
    expect((await adminOrganizationsService.setAssetPolicy(9, body)).restricted).toBe(true);
    expect(put).toHaveBeenCalledWith("admin/organizations/9/asset-policy", body);
    const { adminOrganizationKeys } = await import("@/hooks/AdminOrganizations/useAdminOrganizations");
    expect(adminOrganizationKeys.assetPolicy(1)).not.toEqual(adminOrganizationKeys.assetPolicy(2));
    vi.doUnmock("@/api/config");
  });
});
