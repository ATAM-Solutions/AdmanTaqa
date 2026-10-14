import axiosInstance from "@/api/config";

export interface MyTaskRow {
  id: number;
  status: string;
  notes: string | null;
  createdAt: string | null;
  orderId: number | null;
  orderTitle: string | null;
  orderPriority: string | null;
  assignedBy: string | null;
  stationName: string | null;
  stationAddress: string | null;
  pendingStatus: string | null;
}

export interface WarehouseRequestRow {
  id: number;
  status: string;
  createdAt: string | null;
  stationName: string | null;
  warehouseName: string | null;
  workOrderTitle: string | null;
  itemCount: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

const obj = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : null;
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

function unwrap(payload: unknown): { rows: unknown[]; total: number; page: number; limit: number } {
  const root = obj(payload);
  const data = obj(root?.data) ?? root;
  const rows = Array.isArray(data?.items) ? (data.items as unknown[]) : Array.isArray(root?.data) ? (root!.data as unknown[]) : [];
  const pg = obj(data?.pagination);
  return {
    rows,
    total: typeof pg?.total === "number" ? pg.total : typeof data?.total === "number" ? (data.total as number) : rows.length,
    page: typeof pg?.page === "number" ? pg.page : 1,
    limit: typeof pg?.limit === "number" ? pg.limit : rows.length,
  };
}

/** Tasks assigned to the signed-in user — internal-work-order tasks included. */
export async function fetchMyTasks(page = 1, limit = 20): Promise<Paged<MyTaskRow>> {
  const res = await axiosInstance.get("internal-tasks/my", { params: { page, limit } });
  const { rows, total, page: p, limit: l } = unwrap(res.data);
  const items = rows
    .map((r) => obj(r))
    .filter((r): r is Record<string, unknown> => !!r && typeof r.id === "number")
    .map((r) => {
      const iwo = obj(r.InternalWorkOrder);
      const wo = obj(r.WorkOrder);
      const by = obj(r.AssignedByUser);
      const orderId =
        typeof iwo?.id === "number" ? (iwo.id as number) : null;
      return {
        id: r.id as number,
        status: str(r.status) ?? "ASSIGNED",
        notes: str(r.notes),
        createdAt: str(r.createdAt),
        orderId,
        orderTitle: str(iwo?.title) ?? str(wo?.title),
        orderPriority: str(iwo?.priority),
        assignedBy: str(by?.fullName),
        stationName: str(obj(r.Branch)?.nameEn) ?? str(obj(r.Branch)?.nameAr),
        stationAddress: str(obj(r.Branch)?.address),
        pendingStatus: str(r.pendingStatus),
      };
    });
  return { items, total, page: p, limit: l || limit };
}

/** The signed-in user's warehouse (spare-parts) requests. Technicians only ever receive their own. */
export async function fetchWarehouseRequests(page = 1, limit = 20): Promise<Paged<WarehouseRequestRow>> {
  const res = await axiosInstance.get("warehouse-orders", { params: { page, limit } });
  const { rows, total, page: p, limit: l } = unwrap(res.data);
  const items = rows
    .map((r) => obj(r))
    .filter((r): r is Record<string, unknown> => !!r && typeof r.id === "number")
    .map((r) => ({
      id: r.id as number,
      status: str(r.status) ?? "DRAFT",
      createdAt: str(r.createdAt),
      stationName: str(obj(r.Branch)?.nameEn) ?? str(obj(r.Branch)?.nameAr),
      warehouseName: str(obj(r.Warehouse)?.name),
      workOrderTitle: str(obj(r.WorkOrder)?.title),
      itemCount: Array.isArray(r.WarehouseOrderItems) ? (r.WarehouseOrderItems as unknown[]).length : 0,
    }));
  return { items, total, page: p, limit: l || limit };
}
