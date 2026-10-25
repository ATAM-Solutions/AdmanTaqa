import { describe, expect, it } from "vitest";
import enWarehouse from "@/i18n/locales/en/warehouse.json";
import arWarehouse from "@/i18n/locales/ar/warehouse.json";
import { activationChange, ASSIGNMENT_ERROR_CODES, assignmentErrorKey, servedStationIds } from "./warehouseAssignments";
import type { AssignmentImpact } from "@/api/services/warehouseAdminService";

const impact = (over: Partial<AssignmentImpact> = {}): AssignmentImpact => ({
  enabled: false, warehouses: 2, managers: 3, managersWithAssignment: 1,
  managersWithoutAssignment: [{ userId: 1, fullName: "A", email: null }, { userId: 2, fullName: "B", email: null }],
  warehousesWithoutManager: [], openOrdersInWarehousesWithoutManager: 0, blockers: [], canActivate: true, requiresConfirmation: true, ...over,
});

describe("activation echoes the exact impact the administrator saw", () => {
  it("sends the unassigned count and the confirmation flag", () => {
    expect(activationChange(impact(), true)).toEqual({ enabled: true, confirmImpact: true, expectedUnassignedManagers: 2 });
    expect(activationChange(impact(), false)).toEqual({ enabled: true, confirmImpact: false, expectedUnassignedManagers: 2 });
    expect(activationChange(impact({ managersWithoutAssignment: [] }), true).expectedUnassignedManagers).toBe(0);
  });
});

describe("stations a warehouse serves", () => {
  it("home first, links after, no duplicates; none means company level", () => {
    expect(servedStationIds(4, [5, 4, 6])).toEqual([4, 5, 6]);
    expect(servedStationIds(null, [])).toEqual([]);
    expect(servedStationIds(null, [7])).toEqual([7]);
  });
});

/** Every key of the English block must exist in Arabic (Arabic has more plural forms; base keys are compared). */
const flat = (o: unknown, prefix = ""): string[] =>
  o && typeof o === "object" ? Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => flat(v, prefix ? `${prefix}.${k}` : k)) : [prefix];
type Block = Record<string, Record<string, Record<string, string>>>;
const lookup = (file: unknown, ns: string, k: string) => (file as Block).mgmt[ns][k];
const base = (k: string) => k.replace(/_(zero|one|two|few|many|other)$/, "");

describe("Arabic and English labels", () => {
  const en = new Set(flat((enWarehouse as Record<string, unknown>).mgmt).map(base));
  const ar = new Set(flat((arWarehouse as Record<string, unknown>).mgmt).map(base));
  it("every English label has an Arabic one and vice versa", () => {
    expect([...en].filter((k) => !ar.has(k))).toEqual([]);
    expect([...ar].filter((k) => !en.has(k))).toEqual([]);
  });
  it("every server error code of the assignment endpoints is translated in both languages", () => {
    for (const code of ASSIGNMENT_ERROR_CODES) {
      const key = assignmentErrorKey(code) as string;
      const [, ns, k] = key.split(".");
      expect(lookup(enWarehouse, ns, k), `${code} (en)`).toBeTruthy();
      expect(lookup(arWarehouse, ns, k), `${code} (ar)`).toBeTruthy();
    }
    expect(assignmentErrorKey("SOMETHING_ELSE")).toBeNull();
    expect(assignmentErrorKey(null)).toBeNull();
  });
});
