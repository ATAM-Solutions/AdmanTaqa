import { describe, expect, it } from "vitest";
import { MANUAL_ELIGIBLE_JOB_STATUSES, isValidManualReason, manualCheckinState, manualErrorKey } from "./manualCheckin";

const op = [{ id: 1, name: "Field Op" }];
const base = { hasManualPermission: true, hasAssignPermission: true, viewerIsAssigned: false, operators: op, status: "ACTIVE", visits: [{ id: 7, status: "DRAFT", visitDate: "2026-10-29" }] };

describe("manualCheckinState", () => {
  it("is available to a manager who holds BOTH keys, on an executable job with an assigned operator and an open visit", () => {
    expect(manualCheckinState(base)).toEqual({ kind: "available", visit: { id: 7, status: "DRAFT", visitDate: "2026-10-29" }, operators: op });
    expect(manualCheckinState({ ...base, visits: [{ id: 8, status: "SCHEDULED" }] }).kind).toBe("available");
    for (const status of MANUAL_ELIGIBLE_JOB_STATUSES) expect(manualCheckinState({ ...base, status }).kind).toBe("available");
  });
  it("is hidden without either key (an operator holds manual_checkin but never assign_operator; an old manager copy may lack manual_checkin)", () => {
    expect(manualCheckinState({ ...base, hasAssignPermission: false }).kind).toBe("hidden");
    expect(manualCheckinState({ ...base, hasManualPermission: false }).kind).toBe("hidden");
  });
  it("is hidden for the assigned operator (their own controls apply), with no assigned operator, on a non-executable job, or once checked in", () => {
    expect(manualCheckinState({ ...base, viewerIsAssigned: true }).kind).toBe("hidden");
    expect(manualCheckinState({ ...base, operators: [] }).kind).toBe("hidden");
    for (const status of ["AWAITING_PAYMENT", "UNDER_REVIEW", "REWORK_REQUIRED", "CLOSED", "CANCELLED", ""]) expect(manualCheckinState({ ...base, status }).kind).toBe("hidden");
    expect(manualCheckinState({ ...base, visits: [{ id: 7, status: "CHECKED_IN" }] }).kind).toBe("hidden");
    expect(manualCheckinState({ ...base, visits: [{ id: 6, status: "DRAFT" }, { id: 7, status: "CHECKED_IN" }] }).kind).toBe("hidden");
  });
  it("asks for the operator to open the visit first (a manager never creates the visit); completed visits are not eligible", () => {
    expect(manualCheckinState({ ...base, visits: [] }).kind).toBe("needsVisit");
    expect(manualCheckinState({ ...base, visits: [{ id: 7, status: "COMPLETED" }, { id: 8, status: "CANCELLED" }] }).kind).toBe("needsVisit");
  });
});

describe("reason and errors", () => {
  it("a reason needs at least 3 non-blank characters", () => {
    for (const r of ["", "  ", "ab", " a "]) expect(isValidManualReason(r)).toBe(false);
    for (const r of ["abc", "لا يوجد اتصال", "  abc  "]) expect(isValidManualReason(r)).toBe(true);
  });
  const api = (status: number, data: unknown) => ({ response: { status, data } });
  it("maps every server code to a message key, the plain already-checked-in 409, other 403s, and anything else to a generic one", () => {
    for (const code of ["MANUAL_REASON_REQUIRED", "MANUAL_TARGET_REQUIRED", "VISIT_JOB_MISMATCH", "OPERATOR_NOT_ASSIGNED_TO_JOB", "NO_ASSIGNED_OPERATOR", "NOT_ASSIGNED_OPERATOR", "VISIT_ALREADY_CHECKED_IN"]) expect(manualErrorKey(api(409, { code }))).toBe(code);
    expect(manualErrorKey(api(409, { message: "ExternalJobVisit: Transition from CHECKED_IN to CHECKED_IN is not allowed" }))).toBe("alreadyCheckedIn");
    expect(manualErrorKey(api(403, { message: "Insufficient permissions" }))).toBe("forbidden");
    expect(manualErrorKey(api(500, {}))).toBe("generic");
    expect(manualErrorKey(new Error("network"))).toBe("generic");
    expect(manualErrorKey(undefined)).toBe("generic");
  });
});
