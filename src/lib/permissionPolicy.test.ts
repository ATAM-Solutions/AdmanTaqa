import { describe, expect, it } from "vitest";
import {
  buildDraft, canShowPermissionPolicyTab, classifyPermissionPolicyError, codeKey, diffDraft, losers, moduleRank, toggleRestricted, toggleRole,
} from "./permissionPolicy";
import type { AdminPermissionPolicy, PolicyPermission } from "@/types/adminOrganization";

const perm = (code: string, over: Partial<PolicyPermission> = {}): PolicyPermission => ({
  code, managedBy: "permission_policy", grantDefault: "closed", decisionKind: null, sensitive: false, restricted: false, eligibleRoleNames: null, holdingRoleNames: [], ...over,
});
const policy = (perms: PolicyPermission[]): AdminPermissionPolicy => ({
  organizationId: 1, organizationType: "FUEL_STATION", usersWithoutJobTitle: 0,
  roles: [
    { id: 1, name: "Station Owner", isSystem: true, isCompanyAdmin: true },
    { id: 2, name: "Station Manager", isSystem: true, isCompanyAdmin: false },
    { id: 3, name: "Technician", isSystem: true, isCompanyAdmin: false },
  ],
  modules: [{ id: "maintenance_decision", permissions: perms }],
});
const DECIDE = perm("maintenance_issues.decide", { holdingRoleNames: ["Station Owner", "Maintenance Manager"], decisionKind: "formal_decision", sensitive: true });
const ASSET = perm("assets.create", { managedBy: "asset_policy", grantDefault: "open" });

describe("matrix draft", () => {
  it("starts from what the API reported and leaves asset creation to its own tab", () => {
    const d = buildDraft(policy([DECIDE, ASSET, perm("x.restricted", { restricted: true, eligibleRoleNames: ["Technician"] })]));
    expect(d["maintenance_issues.decide"]).toEqual({ restricted: false, eligible: [] });
    expect(d["x.restricted"]).toEqual({ restricted: true, eligible: ["Technician"] });
    expect(d["assets.create"]).toBeUndefined();
  });
  it("switching a restriction ON preselects the titles that hold it today (nobody loses it by surprise)", () => {
    const next = toggleRestricted(buildDraft(policy([DECIDE])), DECIDE, true);
    expect(next["maintenance_issues.decide"]).toEqual({ restricted: true, eligible: ["Station Owner", "Maintenance Manager"] });
  });
  it("switching it OFF returns to the platform default", () => {
    const p = policy([perm("a.b", { restricted: true, eligibleRoleNames: ["Technician"] })]);
    expect(toggleRestricted(buildDraft(p), p.modules[0].permissions[0], false)["a.b"].restricted).toBe(false);
  });
  it("selecting and clearing a Job Title only changes that title", () => {
    let d = toggleRestricted(buildDraft(policy([DECIDE])), DECIDE, true);
    d = toggleRole(d, DECIDE.code, "Station Manager", true);
    expect(d[DECIDE.code].eligible).toContain("Station Manager");
    d = toggleRole(d, DECIDE.code, "Station Manager", false);
    expect(d[DECIDE.code].eligible).not.toContain("Station Manager");
  });
});

describe("diff (the smallest request)", () => {
  it("is empty when nothing changed, including after a no-op round trip", () => {
    const p = policy([DECIDE]);
    expect(diffDraft(p, buildDraft(p))).toEqual([]);
    expect(diffDraft(p, toggleRestricted(toggleRestricted(buildDraft(p), DECIDE, true), DECIDE, false))).toEqual([]);
  });
  it("sends only the changed permission, never the company administrator (the server always adds it)", () => {
    const other = perm("internal_tasks.assign");
    const p = policy([DECIDE, other]);
    const d = toggleRole(toggleRestricted(buildDraft(p), DECIDE, true), DECIDE.code, "Station Manager", true);
    expect(diffDraft(p, d)).toEqual([{ code: "maintenance_issues.decide", restricted: true, allowedRoleNames: ["Maintenance Manager", "Station Manager"] }]);
  });
  it("returning to the default sends restricted:false with no titles", () => {
    const p = policy([perm("a.b", { restricted: true, eligibleRoleNames: ["Station Owner", "Technician"] })]);
    expect(diffDraft(p, toggleRestricted(buildDraft(p), p.modules[0].permissions[0], false))).toEqual([{ code: "a.b", restricted: false, allowedRoleNames: [] }]);
  });
  it("an unchanged restricted list is not re-sent even if the order differs", () => {
    const p = policy([perm("a.b", { restricted: true, eligibleRoleNames: ["Station Owner", "Technician", "Station Manager"] })]);
    const d = buildDraft(p);
    d["a.b"] = { restricted: true, eligible: ["Station Manager", "Technician"] };
    expect(diffDraft(p, d)).toEqual([]);
  });
});

describe("warning before removing", () => {
  it("lists exactly the titles that hold the permission today and are not selected", () => {
    const p = policy([perm("a.b", { holdingRoleNames: ["Station Owner", "Station Manager", "Technician"] })]);
    let d = toggleRestricted(buildDraft(p), p.modules[0].permissions[0], true);
    d = toggleRole(d, "a.b", "Technician", false);
    d = toggleRole(d, "a.b", "Station Manager", false);
    expect(losers(p, d)).toEqual([{ code: "a.b", roleName: "Station Manager" }, { code: "a.b", roleName: "Technician" }]);
    expect(losers(p, buildDraft(p))).toEqual([]); // nothing restricted → nobody loses anything
  });
});

describe("tab visibility, ordering, errors", () => {
  it("only the Super Admin sees it, only for Fuel Station and Service Provider companies", () => {
    expect(canShowPermissionPolicyTab("SUPER_ADMIN", "FUEL_STATION")).toBe(true);
    expect(canShowPermissionPolicyTab("SUPER_ADMIN", "SERVICE_PROVIDER")).toBe(true);
    for (const viewer of ["FUEL_STATION", "SERVICE_PROVIDER", "AUTHORITY", undefined]) expect(canShowPermissionPolicyTab(viewer, "FUEL_STATION")).toBe(false);
    expect(canShowPermissionPolicyTab("SUPER_ADMIN", "AUTHORITY")).toBe(false);
  });
  it("modules sort in the platform order, unknown last; codes are keyed with underscores", () => {
    expect(moduleRank("maintenance_reports")).toBeLessThan(moduleRank("warehouse"));
    expect(moduleRank("warehouse")).toBeLessThan(moduleRank("organization_team"));
    expect(moduleRank("something_new")).toBeGreaterThan(moduleRank("organization_team"));
    expect(codeKey("provider.job_orders.read")).toBe("provider_job_orders_read");
  });
  it("classifies failures by stable code, never by message", () => {
    const err = (status: number, code?: string, errors?: unknown) => ({ response: { status, data: { code, errors } } });
    expect(classifyPermissionPolicyError(err(400, "PERMISSION_POLICY_UNKNOWN_ROLE", { unknownRoleNames: ["Ghost"] }))).toEqual({ kind: "unknownRole", names: ["Ghost"] });
    expect(classifyPermissionPolicyError(err(400, "PERMISSION_POLICY_UNKNOWN_CODE")).kind).toBe("unknownCode");
    expect(classifyPermissionPolicyError(err(400, "MANAGED_BY_ASSET_POLICY")).kind).toBe("assetManaged");
    expect(classifyPermissionPolicyError(err(503, "SCHEMA_NOT_READY")).kind).toBe("schemaNotReady");
    expect(classifyPermissionPolicyError(err(503)).kind).toBe("schemaNotReady");
    expect(classifyPermissionPolicyError(err(403)).kind).toBe("forbidden");
    expect(classifyPermissionPolicyError(err(404)).kind).toBe("notFound");
    expect(classifyPermissionPolicyError(err(500)).kind).toBe("server");
    expect(classifyPermissionPolicyError(new Error("offline")).kind).toBe("network");
  });
});
