import axiosInstance from "@/api/config";

/** Error carrying the server's stable `code`, HTTP status and `errors` payload (e.g. warehouse candidates). */
export class WarehouseApiError extends Error {
  code: string | null;
  status: number | null;
  details: Record<string, unknown> | null;
  constructor(message: string, code: string | null, status: number | null, details: Record<string, unknown> | null) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const toError = (err: unknown): WarehouseApiError => {
  const r = err as { response?: { status?: number; data?: { message?: string; code?: string; errors?: Record<string, unknown> } }; message?: string };
  return new WarehouseApiError(
    r.response?.data?.message ?? r.message ?? "Request failed",
    typeof r.response?.data?.code === "string" ? r.response.data.code : null,
    r.response?.status ?? null,
    (r.response?.data?.errors as Record<string, unknown> | undefined) ?? null
  );
};

const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" ? (v as Record<string, unknown>) : null);
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" ? v : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

// ───────────── warehouses + stock ─────────────
export interface WarehouseSummary {
  id: number;
  name: string;
  branchId: number | null;
  stationName: { en: string | null; ar: string | null } | null;
}
export interface WarehouseListResult {
  items: WarehouseSummary[];
  meta: { isOrgWide: boolean; canAddItems: boolean; canManageWarehouses: boolean };
}
export interface StockItem {
  id: number;
  name: string;
  code: string | null;
  category: string | null;
  unit: string | null;
  quantity: number;
  minQuantity: number;
}

export async function fetchWarehouses(): Promise<WarehouseListResult> {
  try {
    const res = await axiosInstance.get("warehouses");
    const root = obj(res.data);
    const meta = obj(root?.meta);
    return {
      items: arr(root?.data)
        .map(obj)
        .filter((w): w is Record<string, unknown> => !!w && typeof w.id === "number")
        .map((w) => {
          const b = obj(w.Branch);
          return {
            id: w.id as number,
            name: str(w.name) ?? `#${w.id}`,
            branchId: num(w.branchId),
            stationName: b ? { en: str(b.nameEn), ar: str(b.nameAr) } : null,
          };
        }),
      meta: {
        isOrgWide: obj(meta?.scope)?.isOrgWide === true,
        canAddItems: obj(meta?.capabilities)?.canAddItems === true,
        canManageWarehouses: obj(meta?.capabilities)?.canManageWarehouses === true,
      },
    };
  } catch (e) {
    throw toError(e);
  }
}

export async function fetchStock(warehouseId: number, search = ""): Promise<StockItem[]> {
  try {
    const res = await axiosInstance.get(`warehouses/${warehouseId}/items`, { params: { limit: 200, ...(search ? { search } : {}) } });
    const data = obj(obj(res.data)?.data);
    return arr(data?.items)
      .map(obj)
      .filter((i): i is Record<string, unknown> => !!i && typeof i.id === "number")
      .map((i) => ({
        id: i.id as number,
        name: str(i.name) ?? "",
        code: str(i.code),
        category: str(i.category),
        unit: str(i.unit),
        quantity: Number(i.quantity ?? 0),
        minQuantity: Number(i.minQuantity ?? 0),
      }));
  } catch (e) {
    throw toError(e);
  }
}

export async function addStockItem(warehouseId: number, body: { name: string; code?: string; quantity: number; unit?: string }): Promise<void> {
  try {
    await axiosInstance.post(`warehouses/${warehouseId}/items`, body);
  } catch (e) {
    throw toError(e);
  }
}

// ───────────── capabilities (delegation) ─────────────
export type CapabilityEffect = "GRANT" | "DENY" | "DEFAULT";
export interface CapabilityState {
  code: string;
  /** What the person can actually do now (for assets.create this already includes Super Admin's ceiling). */
  effective: boolean;
  /** The person's role grants it. */
  byRole: boolean;
  /** The company manager's individual setting, if any. */
  override: "GRANT" | "DENY" | null;
  /** Super Admin's company policy allows this person's role to hold the capability (always true when not policy-controlled). */
  eligible?: boolean;
  /** Why `eligible` is false: ROLE_NOT_ELIGIBLE (platform restriction) | POLICY_UNAVAILABLE (cannot be verified right now). */
  eligibilityReason?: "ROLE_NOT_ELIGIBLE" | "POLICY_UNAVAILABLE" | null;
  /** assets.create only: the company has a restriction set by the platform administrator. */
  restrictedByPlatform?: boolean;
}
export async function fetchUserCapabilities(userId: number | string): Promise<CapabilityState[]> {
  try {
    const res = await axiosInstance.get(`team/users/${userId}/capabilities`);
    return arr(obj(res.data)?.data) as CapabilityState[];
  } catch (e) {
    throw toError(e);
  }
}
export async function setUserCapability(userId: number | string, capability: string, effect: CapabilityEffect): Promise<CapabilityState[]> {
  try {
    const res = await axiosInstance.patch(`team/users/${userId}/capabilities`, { capability, effect });
    return arr(obj(res.data)?.data) as CapabilityState[];
  } catch (e) {
    throw toError(e);
  }
}

// ───────────── warehouse request (order) ─────────────
export interface OrderLine {
  id: number;
  partName: string;
  partCode: string | null;
  quantity: number;
  approvedQuantity: number | null;
  issuedQuantity: number | null;
  status: string;
  sparePartId: number | null;
  unit: string | null;
}
export interface WorkflowAction { allowed: boolean; reason: string | null; actor: string }
export interface OrderDetail {
  id: number;
  status: string;
  notes: string | null;
  createdAt: string | null;
  requestedBy: string | null;
  requestedByUserId: number | null;
  station: { en: string | null; ar: string | null } | null;
  warehouse: { id: number; name: string } | null;
  taskId: number | null;
  rejectionReason: string | null;
  items: OrderLine[];
  updates: { id: number; message: string | null; newStatus: string | null; by: string | null; createdAt: string }[];
  workflow: {
    status: string;
    terminal: boolean;
    nextStep: { actor: string; action: string } | null;
    warehouseAssigned: boolean;
    itemCount: number;
    actions: Record<string, WorkflowAction>;
    unmappedItemIds?: number[];
  } | null;
}

export function normalizeOrder(raw: unknown): OrderDetail | null {
  const r = obj(raw);
  if (!r || typeof r.id !== "number") return null;
  const b = obj(r.Branch);
  const wh = obj(r.Warehouse);
  const wf = obj(r.workflow);
  return {
    id: r.id,
    status: str(r.status) ?? "DRAFT",
    notes: str(r.notes),
    createdAt: str(r.createdAt),
    requestedBy: str(obj(r.RequestedByUser)?.fullName),
    requestedByUserId: num(r.requestedByUserId),
    station: b ? { en: str(b.nameEn), ar: str(b.nameAr) } : null,
    warehouse: wh && typeof wh.id === "number" ? { id: wh.id as number, name: str(wh.name) ?? `#${wh.id}` } : null,
    taskId: num(r.internalTaskId),
    rejectionReason: str(r.rejectionReason),
    items: arr(r.WarehouseOrderItems)
      .map(obj)
      .filter((i): i is Record<string, unknown> => !!i && typeof i.id === "number")
      .map((i) => ({
        id: i.id as number,
        partName: str(i.partName) ?? "",
        partCode: str(i.partCode),
        quantity: Number(i.quantity ?? 0),
        approvedQuantity: num(i.approvedQuantity),
        issuedQuantity: num(i.issuedQuantity),
        status: str(i.status) ?? "REQUESTED",
        sparePartId: num(i.sparePartId),
        unit: str(i.unit),
      })),
    updates: arr(r.WarehouseOrderUpdates)
      .map(obj)
      .filter((u): u is Record<string, unknown> => !!u && typeof u.id === "number")
      .map((u) => ({ id: u.id as number, message: str(u.message), newStatus: str(u.newStatus), by: str(obj(u.CreatedByUser)?.fullName), createdAt: str(u.createdAt) ?? "" })),
    workflow: wf && Array.isArray(Object.keys(obj(wf.actions) ?? {})) ? (wf as unknown as OrderDetail["workflow"]) : null,
  };
}

export async function fetchOrder(id: number | string): Promise<OrderDetail> {
  try {
    const res = await axiosInstance.get(`warehouse-orders/${id}`);
    const o = normalizeOrder(obj(res.data)?.data);
    if (!o) throw new Error("Unexpected response");
    return o;
  } catch (e) {
    throw toError(e);
  }
}

export type OrderAction =
  | { kind: "editItems"; items: { partName: string; quantity: number; sparePartId?: number | null; unit?: string }[] }
  | { kind: "submit"; warehouseId?: number }
  | { kind: "maintenanceApprove"; decision: "APPROVE" | "REJECT"; reason?: string }
  | { kind: "review" }
  | { kind: "approve" }
  | { kind: "reject"; reason: string }
  | { kind: "issue" }
  | { kind: "deliver" }
  | { kind: "partialReturn"; items: { itemId: number; quantity: number }[] }
  | { kind: "submitReturn" }
  | { kind: "acknowledgeReturn" }
  | { kind: "confirmReturn" }
  | { kind: "close" }
  | { kind: "cancel" }
  | { kind: "mapItem"; itemId: number; sparePartId: number };

export async function runOrderAction(id: number | string, a: OrderAction): Promise<void> {
  const base = `warehouse-orders/${id}`;
  try {
    switch (a.kind) {
      case "editItems": await axiosInstance.put(`${base}/items`, { items: a.items }); break;
      case "submit": await axiosInstance.patch(`${base}/submit`, a.warehouseId ? { warehouseId: a.warehouseId } : {}); break;
      case "maintenanceApprove": await axiosInstance.patch(`${base}/maintenance-approve`, { decision: a.decision, reason: a.reason }); break;
      case "review": await axiosInstance.patch(`${base}/review`, {}); break;
      case "approve": await axiosInstance.patch(`${base}/approve`, {}); break;
      case "reject": await axiosInstance.patch(`${base}/reject`, { reason: a.reason }); break;
      case "issue": await axiosInstance.patch(`${base}/issue`, {}); break;
      case "deliver": await axiosInstance.patch(`${base}/deliver`, {}); break;
      case "partialReturn": await axiosInstance.patch(`${base}/return/partial`, { items: a.items }); break;
      case "submitReturn": await axiosInstance.patch(`${base}/return/submit`, {}); break;
      case "acknowledgeReturn": await axiosInstance.patch(`${base}/return/acknowledge`, {}); break;
      case "confirmReturn": await axiosInstance.patch(`${base}/return/confirm`, {}); break;
      case "close": await axiosInstance.patch(`${base}/close`, {}); break;
      case "cancel": await axiosInstance.patch(`${base}/cancel`, {}); break;
      case "mapItem": await axiosInstance.patch(`${base}/items/${a.itemId}/map`, { sparePartId: a.sparePartId }); break;
    }
  } catch (e) {
    throw toError(e);
  }
}
