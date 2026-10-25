import axiosInstance from "@/api/config";
import { toError } from "@/api/services/warehouseService";

const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" ? (v as Record<string, unknown>) : null);
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" ? v : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const rows = (v: unknown) => arr(v).map(obj).filter((r): r is Record<string, unknown> => !!r);

// ───────────── managers ─────────────
export interface WarehouseManagerRow {
  id: number;
  userId: number;
  fullName: string | null;
  email: string | null;
  isActive: boolean;
  assignedAt: string | null;
}
export async function fetchWarehouseManagers(warehouseId: number): Promise<WarehouseManagerRow[]> {
  try {
    const res = await axiosInstance.get(`warehouses/${warehouseId}/managers`);
    return rows(obj(res.data)?.data)
      .filter((r) => typeof r.userId === "number")
      .map((r) => ({
        id: num(r.id) ?? 0, userId: r.userId as number, fullName: str(r.fullName), email: str(r.email),
        isActive: r.isActive !== false, assignedAt: str(r.assignedAt),
      }));
  } catch (e) {
    throw toError(e);
  }
}
export async function assignWarehouseManager(warehouseId: number, userId: number): Promise<{ created: boolean }> {
  try {
    const res = await axiosInstance.post(`warehouses/${warehouseId}/managers`, { userId });
    return { created: obj(obj(res.data)?.data)?.created === true };
  } catch (e) {
    throw toError(e);
  }
}
export async function removeWarehouseManager(warehouseId: number, userId: number): Promise<{ removed: boolean; remainingManagers: number }> {
  try {
    const res = await axiosInstance.delete(`warehouses/${warehouseId}/managers/${userId}`);
    const d = obj(obj(res.data)?.data);
    return { removed: d?.removed === true, remainingManagers: num(d?.remainingManagers) ?? 0 };
  } catch (e) {
    throw toError(e);
  }
}

// ───────────── stations ─────────────
export interface StationRef { branchId: number; nameEn: string | null; nameAr: string | null }
export interface WarehouseStationsResult {
  home: StationRef | null;
  /** No home station and no links: serves every station of the company (the legacy rule). */
  companyLevel: boolean;
  links: StationRef[];
}
const stationRef = (r: Record<string, unknown>): StationRef => ({ branchId: r.branchId as number, nameEn: str(r.nameEn), nameAr: str(r.nameAr) });
export async function fetchWarehouseStations(warehouseId: number): Promise<WarehouseStationsResult> {
  try {
    const res = await axiosInstance.get(`warehouses/${warehouseId}/stations`);
    const d = obj(obj(res.data)?.data);
    const home = obj(d?.home);
    return {
      home: home && typeof home.branchId === "number" ? stationRef(home) : null,
      companyLevel: d?.companyLevel === true,
      links: rows(d?.links).filter((r) => typeof r.branchId === "number").map(stationRef),
    };
  } catch (e) {
    throw toError(e);
  }
}
export async function linkWarehouseStation(warehouseId: number, branchId: number): Promise<void> {
  try {
    await axiosInstance.post(`warehouses/${warehouseId}/stations`, { branchId });
  } catch (e) {
    throw toError(e);
  }
}
export async function unlinkWarehouseStation(warehouseId: number, branchId: number): Promise<void> {
  try {
    await axiosInstance.delete(`warehouses/${warehouseId}/stations/${branchId}`);
  } catch (e) {
    throw toError(e);
  }
}

// ───────────── assignment scoping (policy + impact) ─────────────
export interface AssignmentImpact {
  enabled: boolean;
  warehouses: number;
  managers: number;
  managersWithAssignment: number;
  managersWithoutAssignment: { userId: number; fullName: string | null; email: string | null }[];
  warehousesWithoutManager: { id: number; name: string }[];
  openOrdersInWarehousesWithoutManager: number;
  blockers: string[];
  canActivate: boolean;
  requiresConfirmation: boolean;
}
export interface AssignmentPolicy { enabled: boolean; impact: AssignmentImpact | null }
export async function fetchAssignmentPolicy(): Promise<AssignmentPolicy> {
  try {
    const res = await axiosInstance.get("warehouses/assignment-policy");
    const d = obj(obj(res.data)?.data);
    const hasImpact = typeof d?.managers === "number";
    return {
      enabled: d?.enabled === true,
      impact: hasImpact
        ? {
            enabled: d?.enabled === true,
            warehouses: num(d?.warehouses) ?? 0,
            managers: num(d?.managers) ?? 0,
            managersWithAssignment: num(d?.managersWithAssignment) ?? 0,
            managersWithoutAssignment: rows(d?.managersWithoutAssignment).map((m) => ({ userId: num(m.userId) ?? 0, fullName: str(m.fullName), email: str(m.email) })),
            warehousesWithoutManager: rows(d?.warehousesWithoutManager).map((w) => ({ id: num(w.id) ?? 0, name: str(w.name) ?? `#${w.id}` })),
            openOrdersInWarehousesWithoutManager: num(d?.openOrdersInWarehousesWithoutManager) ?? 0,
            blockers: arr(d?.blockers).filter((b): b is string => typeof b === "string"),
            canActivate: d?.canActivate === true,
            requiresConfirmation: d?.requiresConfirmation === true,
          }
        : null,
    };
  } catch (e) {
    throw toError(e);
  }
}
export type PolicyChange = { enabled: false } | { enabled: true; confirmImpact: boolean; expectedUnassignedManagers: number };
export async function setAssignmentPolicy(change: PolicyChange): Promise<void> {
  try {
    await axiosInstance.put("warehouses/assignment-policy", change);
  } catch (e) {
    throw toError(e);
  }
}

// ───────────── stock movements + orders per warehouse ─────────────
export interface MovementRow {
  id: number;
  type: "INITIAL" | "ISSUE" | "RETURN" | "ADJUSTMENT";
  delta: number;
  quantityBefore: number;
  quantityAfter: number;
  itemName: string | null;
  itemCode: string | null;
  unit: string | null;
  warehouseOrderId: number | null;
  note: string | null;
  createdAt: string | null;
}
export interface Paged<T> { items: T[]; total: number; page: number; totalPages: number }
const TYPES = ["INITIAL", "ISSUE", "RETURN", "ADJUSTMENT"];
export async function fetchMovements(warehouseId: number, page = 1, type = ""): Promise<Paged<MovementRow>> {
  try {
    const res = await axiosInstance.get(`warehouses/${warehouseId}/movements`, { params: { page, limit: 25, ...(type ? { type } : {}) } });
    const d = obj(obj(res.data)?.data);
    const pg = obj(d?.pagination);
    return {
      items: rows(d?.movements)
        .filter((m) => typeof m.id === "number" && TYPES.includes(String(m.type)))
        .map((m) => ({
          id: m.id as number, type: m.type as MovementRow["type"], delta: Number(m.delta ?? 0), quantityBefore: Number(m.quantityBefore ?? 0),
          quantityAfter: Number(m.quantityAfter ?? 0), itemName: str(m.itemName), itemCode: str(m.itemCode), unit: str(m.unit),
          warehouseOrderId: num(m.warehouseOrderId), note: str(m.note), createdAt: str(m.createdAt),
        })),
      total: num(pg?.total) ?? 0, page: num(pg?.page) ?? page, totalPages: Math.max(1, num(pg?.totalPages) ?? 1),
    };
  } catch (e) {
    throw toError(e);
  }
}

export interface WarehouseOrderRow { id: number; status: string; createdAt: string | null; stationName: string | null; requestedBy: string | null; itemCount: number }
export async function fetchWarehouseOrdersFor(warehouseId: number, page = 1): Promise<Paged<WarehouseOrderRow>> {
  try {
    const res = await axiosInstance.get("warehouse-orders", { params: { warehouseId, page, limit: 20 } });
    const d = obj(obj(res.data)?.data);
    const pg = obj(d?.pagination);
    return {
      items: rows(d?.items)
        .filter((o) => typeof o.id === "number")
        .map((o) => ({
          id: o.id as number, status: str(o.status) ?? "DRAFT", createdAt: str(o.createdAt),
          stationName: str(obj(o.Branch)?.nameEn) ?? str(obj(o.Branch)?.nameAr),
          requestedBy: str(obj(o.RequestedByUser)?.fullName),
          itemCount: arr(o.WarehouseOrderItems).length,
        })),
      total: num(pg?.total) ?? 0, page: num(pg?.page) ?? page, totalPages: Math.max(1, num(pg?.totalPages) ?? 1),
    };
  } catch (e) {
    throw toError(e);
  }
}

export async function createWarehouse(body: { name: string; branchId: number | null }): Promise<void> {
  try {
    await axiosInstance.post("warehouses", body);
  } catch (e) {
    throw toError(e);
  }
}
