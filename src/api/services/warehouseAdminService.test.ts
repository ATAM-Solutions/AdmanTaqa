import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock("./../config", () => ({ default: http }));

import {
  assignWarehouseManager, fetchAssignmentPolicy, fetchMovements, fetchWarehouseManagers, fetchWarehouseOrdersFor, fetchWarehouseStations,
  linkWarehouseStation, removeWarehouseManager, setAssignmentPolicy, unlinkWarehouseStation,
} from "./warehouseAdminService";

beforeEach(() => Object.values(http).forEach((f) => f.mockReset().mockResolvedValue({ data: {} })));

describe("warehouse administration requests", () => {
  it("assign, remove, link and unlink hit the documented endpoints with the documented bodies", async () => {
    await assignWarehouseManager(3, 9);
    await removeWarehouseManager(3, 9);
    await linkWarehouseStation(3, 5);
    await unlinkWarehouseStation(3, 5);
    expect(http.post).toHaveBeenNthCalledWith(1, "warehouses/3/managers", { userId: 9 });
    expect(http.delete).toHaveBeenNthCalledWith(1, "warehouses/3/managers/9");
    expect(http.post).toHaveBeenNthCalledWith(2, "warehouses/3/stations", { branchId: 5 });
    expect(http.delete).toHaveBeenNthCalledWith(2, "warehouses/3/stations/5");
  });

  it("turning scoping on carries the confirmation and the exact count; turning it off carries nothing else", async () => {
    await setAssignmentPolicy({ enabled: true, confirmImpact: true, expectedUnassignedManagers: 2 });
    await setAssignmentPolicy({ enabled: false });
    expect(http.put).toHaveBeenNthCalledWith(1, "warehouses/assignment-policy", { enabled: true, confirmImpact: true, expectedUnassignedManagers: 2 });
    expect(http.put).toHaveBeenNthCalledWith(2, "warehouses/assignment-policy", { enabled: false });
  });

  it("movements and orders are requested per warehouse, with paging and the type filter", async () => {
    await fetchMovements(3, 2, "ISSUE");
    expect(http.get).toHaveBeenCalledWith("warehouses/3/movements", { params: { page: 2, limit: 25, type: "ISSUE" } });
    await fetchWarehouseOrdersFor(3, 1);
    expect(http.get).toHaveBeenCalledWith("warehouse-orders", { params: { warehouseId: 3, page: 1, limit: 20 } });
  });
});

describe("responses are normalised, never trusted", () => {
  it("managers and stations ignore malformed rows", async () => {
    http.get.mockResolvedValueOnce({ data: { data: [{ id: 1, userId: 7, fullName: "Sara", email: "s@x.t", isActive: true, assignedAt: "2026-10-25T10:00:00Z" }, { id: 2 }, null] } });
    expect(await fetchWarehouseManagers(3)).toEqual([{ id: 1, userId: 7, fullName: "Sara", email: "s@x.t", isActive: true, assignedAt: "2026-10-25T10:00:00Z" }]);
    http.get.mockResolvedValueOnce({ data: { data: { home: { branchId: 4, nameEn: "A", nameAr: "أ" }, companyLevel: false, links: [{ branchId: 5, nameEn: "B", nameAr: null }, { nameEn: "x" }] } } });
    const s = await fetchWarehouseStations(3);
    expect(s.home?.branchId).toBe(4);
    expect(s.links).toEqual([{ branchId: 5, nameEn: "B", nameAr: null }]);
  });

  it("the policy answer without an impact (non-administrator) has none; the administrator's has the full preview", async () => {
    http.get.mockResolvedValueOnce({ data: { data: { enabled: true } } });
    expect(await fetchAssignmentPolicy()).toEqual({ enabled: true, impact: null });
    http.get.mockResolvedValueOnce({ data: { data: {
      enabled: false, warehouses: 2, managers: 3, managersWithAssignment: 1, managersWithoutAssignment: [{ userId: 8, fullName: "Omar", email: "o@x.t" }],
      warehousesWithoutManager: [{ id: 4, name: "Main" }], openOrdersInWarehousesWithoutManager: 1, blockers: [], canActivate: true, requiresConfirmation: true,
    } } });
    const p = await fetchAssignmentPolicy();
    expect(p.impact?.managersWithoutAssignment).toHaveLength(1);
    expect(p.impact?.requiresConfirmation).toBe(true);
  });

  it("a 409 keeps the stable error code for the translated message", async () => {
    http.put.mockRejectedValueOnce({ response: { status: 409, data: { message: "x", code: "ASSIGNMENT_IMPACT_CONFIRMATION_REQUIRED" } } });
    await expect(setAssignmentPolicy({ enabled: true, confirmImpact: false, expectedUnassignedManagers: 1 })).rejects.toMatchObject({ code: "ASSIGNMENT_IMPACT_CONFIRMATION_REQUIRED", status: 409 });
  });
});
