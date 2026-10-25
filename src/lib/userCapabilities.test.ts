import { describe, expect, it } from "vitest";
import {
  capabilityQueryKey,
  classifyCapabilityError,
  describeRow,
  editMode,
  isLockingError,
  visibleCapabilities,
  type EditContext,
} from "./userCapabilities";
import type { CapabilityState } from "@/api/services/warehouseService";

const ctx = (over: Partial<EditContext> = {}): EditContext => ({
  viewerHasAssignRoles: true, viewerOrganizationType: "FUEL_STATION", viewerUserId: 1, targetUserId: 2, targetRoleNames: ["Technician"], ...over,
});
const cap = (over: Partial<CapabilityState> = {}): CapabilityState => ({ code: "assets.create", effective: false, byRole: false, override: null, eligible: true, eligibilityReason: null, ...over });

describe("who sees / may edit the card", () => {
  it("an authorized Company Manager of a Fuel Station can edit another, ordinary user", () => {
    expect(editMode(ctx())).toEqual({ mode: "edit", reason: null });
  });
  it("hidden (nothing rendered or requested) without team.assign_roles", () => {
    expect(editMode(ctx({ viewerHasAssignRoles: false })).mode).toBe("hidden");
  });
  it("hidden for any organization that is not a Fuel Station (assets are Fuel Station only)", () => {
    for (const type of ["SERVICE_PROVIDER", "AUTHORITY", "SUPER_ADMIN", undefined]) expect(editMode(ctx({ viewerOrganizationType: type })).mode, String(type)).toBe("hidden");
  });
  it("own account: read-only, whichever id type is used", () => {
    expect(editMode(ctx({ targetUserId: 1 }))).toEqual({ mode: "readonly", reason: "self" });
    expect(editMode(ctx({ viewerUserId: 7, targetUserId: "7" }))).toEqual({ mode: "readonly", reason: "self" });
  });
  it("company administrator (Station Owner): read-only, protected — case-insensitively", () => {
    expect(editMode(ctx({ targetRoleNames: ["Station Owner"] }))).toEqual({ mode: "readonly", reason: "protected" });
    expect(editMode(ctx({ targetRoleNames: ["technician", " station owner "] }))).toEqual({ mode: "readonly", reason: "protected" });
    expect(editMode(ctx({ targetRoleNames: ["Station Manager"] })).mode).toBe("edit");
    expect(editMode(ctx({ targetRoleNames: undefined })).mode).toBe("edit"); // unknown roles: the backend decides
  });
  it("a manager who is also looking at themselves gets self, not protected", () => {
    expect(editMode(ctx({ targetUserId: 1, targetRoleNames: ["Station Owner"] })).reason).toBe("self");
  });
});

describe("which capabilities are shown", () => {
  it("only the two known ones, assets first; unknown codes are ignored", () => {
    const list = [cap({ code: "warehouse_items.create" }), cap({ code: "something.else" }), cap({ code: "assets.create" })];
    expect(visibleCapabilities(list).map((c) => c.code)).toEqual(["assets.create", "warehouse_items.create"]);
  });
  it("a company without asset delegation (API omits assets.create) shows only the warehouse capability", () => {
    expect(visibleCapabilities([cap({ code: "warehouse_items.create" })]).map((c) => c.code)).toEqual(["warehouse_items.create"]);
    expect(visibleCapabilities([])).toEqual([]);
  });
});

describe("row state and offered actions", () => {
  it("no override, role does not grant: GRANT and DENY offered, no reset", () => {
    const r = describeRow(cap());
    expect([r.override, r.inheritedFromRole, r.canGrant, r.canDeny, r.canReset]).toEqual(["none", false, true, true, false]);
  });
  it("GRANT override: GRANT offered no more, DENY and reset are", () => {
    const r = describeRow(cap({ override: "GRANT", effective: true }));
    expect([r.override, r.effective, r.canGrant, r.canDeny, r.canReset]).toEqual(["grant", true, false, true, true]);
  });
  it("DENY override on a role that grants it", () => {
    const r = describeRow(cap({ override: "DENY", byRole: true, effective: false }));
    expect([r.override, r.inheritedFromRole, r.effective, r.canGrant, r.canDeny, r.canReset]).toEqual(["deny", true, false, true, false, true]);
  });
  it("platform restriction (eligible=false): GRANT is never offered; tightening and cleanup still are", () => {
    const r = describeRow(cap({ eligible: false, eligibilityReason: "ROLE_NOT_ELIGIBLE", restrictedByPlatform: true }));
    expect([r.restricted, r.unverifiable, r.canGrant, r.canDeny]).toEqual([true, false, false, true]);
    const stuck = describeRow(cap({ eligible: false, eligibilityReason: "ROLE_NOT_ELIGIBLE", override: "GRANT" }));
    expect([stuck.canGrant, stuck.canDeny, stuck.canReset]).toEqual([false, true, true]);
  });
  it("policy cannot be verified: treated as blocked for granting, flagged separately", () => {
    const r = describeRow(cap({ eligible: false, eligibilityReason: "POLICY_UNAVAILABLE" }));
    expect([r.restricted, r.unverifiable, r.canGrant]).toEqual([false, true, false]);
  });
  it("the warehouse capability (eligible=true, no restriction fields) behaves as before", () => {
    const r = describeRow({ code: "warehouse_items.create", effective: true, byRole: true, override: null });
    expect([r.restricted, r.canGrant, r.canDeny, r.canReset, r.effective]).toEqual([false, true, true, false, true]);
    expect(describeRow({ code: "warehouse_items.create", effective: false, byRole: false, override: "DENY" }).canReset).toBe(true);
  });
  it("never recomputes: effective comes from the API even when it looks inconsistent with the role", () => {
    expect(describeRow(cap({ byRole: true, override: null, effective: false })).effective).toBe(false);
  });
});

describe("error classification (stable codes, both error shapes)", () => {
  const warehouseError = (status: number | null, code: string | null) => Object.assign(new Error("english text"), { status, code });
  const axiosError = (status: number, code?: string) => ({ response: { status, data: { code } } });
  it("maps every handled failure", () => {
    expect(classifyCapabilityError(warehouseError(403, "CAPABILITY_SELF_CHANGE_FORBIDDEN"))).toBe("selfChange");
    expect(classifyCapabilityError(warehouseError(403, "PROTECTED_USER_CAPABILITY_FORBIDDEN"))).toBe("protectedUser");
    expect(classifyCapabilityError(warehouseError(409, "ROLE_NOT_ELIGIBLE"))).toBe("roleNotEligible");
    expect(classifyCapabilityError(warehouseError(503, "PERMISSION_OVERRIDES_UNAVAILABLE"))).toBe("unavailable");
    expect(classifyCapabilityError(warehouseError(400, "CAPABILITY_NOT_DELEGABLE"))).toBe("notDelegable");
    expect(classifyCapabilityError(warehouseError(403, "INSUFFICIENT_PERMISSIONS"))).toBe("forbidden");
    expect(classifyCapabilityError(warehouseError(404, null))).toBe("notFound");
    expect(classifyCapabilityError(warehouseError(500, null))).toBe("server");
    expect(classifyCapabilityError(warehouseError(null, null))).toBe("network");
    expect(classifyCapabilityError(axiosError(403, "PROTECTED_USER_CAPABILITY_FORBIDDEN"))).toBe("protectedUser");
    expect(classifyCapabilityError(axiosError(503))).toBe("unavailable");
    expect(classifyCapabilityError(undefined)).toBe("network");
  });
  it("only self / protected errors lock the card", () => {
    expect(isLockingError("selfChange") && isLockingError("protectedUser")).toBe(true);
    for (const k of ["roleNotEligible", "unavailable", "forbidden", "network", "server", "notFound", "notDelegable"] as const) expect(isLockingError(k), k).toBe(false);
  });
});

describe("company isolation", () => {
  it("the cache key carries the viewer's company: two companies never share an entry", () => {
    expect(capabilityQueryKey(1, 5)).not.toEqual(capabilityQueryKey(2, 5));
    expect(capabilityQueryKey(1, 5)).toEqual(capabilityQueryKey(1, "5"));
    expect(capabilityQueryKey(undefined, 5)).toEqual(["user-capabilities", null, "5"]);
  });
});
