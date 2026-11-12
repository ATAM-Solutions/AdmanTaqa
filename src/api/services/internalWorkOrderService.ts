import type { TaskProgress } from "@/api/services/taskDetailService";
import axiosInstance from "@/api/config";
import type {
  InternalWorkOrderItem,
  InternalWorkOrderListResponse,
  CreateInternalWorkOrderBody,
  UpdateInternalWorkOrderBody,
  ReviewInternalWorkOrderBody,
  InternalWorkflowState,
  PartsReconciliation,
  PartsReconciliationLine,
  PartsBlocker,
  ReviewHistoryEntry,
} from "@/types/internalWorkOrder";

function getErrorMessage(err: unknown, fallback: string): string {
  const withResponse = err as { response?: { data?: { message?: string } } };
  return typeof withResponse.response?.data?.message === "string"
    ? withResponse.response.data.message
    : err instanceof Error
      ? err.message
      : fallback;
}

function normalizeTaskRefs(raw: unknown): InternalWorkOrderItem["tasks"] {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .map((t) => {
      const o = t as Record<string, unknown> | null;
      if (!o || typeof o.id !== "number") return null;
      const au = o.AssignedUser as Record<string, unknown> | null | undefined;
      return {
        id: o.id,
        title: typeof o.title === "string" ? o.title : undefined,
        status: typeof o.status === "string" ? o.status : undefined,
        assignedUserId: typeof o.assignedUserId === "number" ? o.assignedUserId : null,
        progress: o.progress && typeof o.progress === "object" ? (o.progress as TaskProgress) : null,
        assignedUser:
          au && typeof au.id === "number"
            ? { id: au.id, fullName: String(au.fullName ?? ""), email: typeof au.email === "string" ? au.email : null }
            : null,
      };
    })
    .filter((t): t is NonNullable<typeof t> => t !== null);
}

function normalizeSourceReport(raw: unknown): InternalWorkOrderItem["sourceReport"] {
  const r = raw as { id?: number; attachments?: unknown } | null | undefined;
  if (!r || typeof r !== "object" || !Array.isArray(r.attachments)) return null;
  return { id: r.id, attachments: r.attachments as NonNullable<InternalWorkOrderItem["sourceReport"]>["attachments"] };
}

const asRec = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" ? (v as Record<string, unknown>) : null);
const numOr = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const numOrNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

function normalizeWorkflow(raw: unknown): InternalWorkflowState | null {
  const w = asRec(raw);
  if (!w) return null;
  const actor = w.nextActor;
  return {
    version: numOr(w.version, 1),
    legacy: w.legacy !== false,
    stage: typeof w.stage === "string" ? w.stage : "NOT_STARTED",
    nextActor: actor === "TECHNICIAN" || actor === "MAINTENANCE_MANAGER" || actor === "OPERATIONS_MANAGER" ? actor : null,
    partsBlockingClosure: w.partsBlockingClosure === true,
    canFinalClose: w.canFinalClose === true,
  };
}

/** Same line shape in GET /internal/work-orders/:id and in the PARTS_UNRESOLVED 409 body. */
export function normalizePartsLines(raw: unknown): PartsReconciliationLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(asRec)
    .filter((l): l is Record<string, unknown> => !!l)
    .map((l) => ({
      warehouseOrderId: numOrNull(l.warehouseOrderId),
      warehouseOrderStatus: typeof l.warehouseOrderStatus === "string" ? l.warehouseOrderStatus : null,
      assignedTechnicianId: numOrNull(l.assignedTechnicianId),
      itemId: numOrNull(l.itemId),
      partName: typeof l.partName === "string" ? l.partName : "",
      issued: numOr(l.issued, 0),
      received: numOrNull(l.received),
      used: numOrNull(l.used),
      returned: numOr(l.returned, 0),
      returnPending: numOr(l.returnPending, 0),
      unresolved: numOr(l.unresolved, 0),
      shortfall: numOr(l.shortfall, 0),
      usageConfirmed: l.usageConfirmed === true,
      blockers: (Array.isArray(l.blockers) ? l.blockers : []).filter((b): b is PartsBlocker => typeof b === "string"),
    }));
}

function normalizeParts(raw: unknown): PartsReconciliation | null {
  const p = asRec(raw);
  if (!p) return null;
  const t = asRec(p.totals) ?? {};
  return {
    hasIssuedParts: p.hasIssuedParts === true,
    blocking: p.blocking === true,
    blockingLines: numOr(p.blockingLines, 0),
    totals: {
      issued: numOr(t.issued, 0), received: numOr(t.received, 0), used: numOr(t.used, 0),
      returned: numOr(t.returned, 0), returnPending: numOr(t.returnPending, 0), unresolved: numOr(t.unresolved, 0),
    },
    lines: normalizePartsLines(p.lines),
  };
}

function normalizeHistory(raw: unknown): ReviewHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(asRec)
    .filter((h): h is Record<string, unknown> => !!h && typeof h.id === "number")
    .map((h) => {
      const a = asRec(h.actor);
      return {
        id: h.id as number,
        stage: typeof h.stage === "string" ? h.stage : "",
        decision: typeof h.decision === "string" ? h.decision : "",
        comment: typeof h.comment === "string" && h.comment ? h.comment : null,
        internalTaskId: numOrNull(h.internalTaskId),
        actor: a && typeof a.id === "number" ? { id: a.id, fullName: String(a.fullName ?? "") } : null,
        createdAt: typeof h.createdAt === "string" ? h.createdAt : "",
      };
    });
}

function normalizeItem(raw: unknown): InternalWorkOrderItem | null {
  if (raw == null || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const id = obj.id;
  if (id == null || (typeof id !== "number" && typeof id !== "string")) return null;
  return {
    id: typeof id === "string" ? Number(id) : id,
    title: typeof obj.title === "string" ? obj.title : "Untitled",
    branchId: typeof obj.branchId === "number" ? obj.branchId : null,
    assetId: typeof obj.assetId === "number" ? obj.assetId : null,
    description: typeof obj.description === "string" ? obj.description : null,
    priority:
      obj.priority === "LOW" || obj.priority === "MEDIUM" || obj.priority === "HIGH"
        ? obj.priority
        : undefined,
    // Keep the server's status verbatim (OPEN, MAINTENANCE_CLOSED, CANCELLED… used to collapse to PENDING).
    status: (typeof obj.status === "string" ? obj.status : "PENDING") as InternalWorkOrderItem["status"],
    createdAt: typeof obj.createdAt === "string" ? obj.createdAt : undefined,
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : undefined,
    tasks: normalizeTaskRefs(obj.InternalTasks ?? obj.tasks),
    sourceReport: normalizeSourceReport(obj.sourceReport),
    workflowVersion: typeof obj.workflowVersion === "number" ? obj.workflowVersion : undefined,
    closedAt: typeof obj.closedAt === "string" ? obj.closedAt : null,
    closedByUserId: typeof obj.closedByUserId === "number" ? obj.closedByUserId : null,
    workflow: normalizeWorkflow(obj.workflow),
    partsReconciliation: normalizeParts(obj.partsReconciliation),
    reviewHistory: normalizeHistory(obj.reviewHistory),
  };
}

export async function fetchInternalWorkOrders(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: InternalWorkOrderItem[]; total: number; page: number; limit: number }> {
  const res = await axiosInstance.get<InternalWorkOrderListResponse>("internal/work-orders", {
    params: params ?? {},
  });
  const data = res.data?.data;
  const rawItems = Array.isArray(data) ? data : (data as { items?: unknown[] })?.items ?? [];
  const items = rawItems
    .map(normalizeItem)
    .filter((r): r is InternalWorkOrderItem => r != null);
  const total = (data as { total?: number })?.total ?? items.length;
  const page = (data as { page?: number })?.page ?? params?.page ?? 1;
  const limit = (data as { limit?: number })?.limit ?? params?.limit ?? 20;
  return { items, total, page, limit };
}

export async function fetchInternalWorkOrderReviewQueue(params?: {
  page?: number;
  limit?: number;
}): Promise<{ items: InternalWorkOrderItem[]; total: number; page: number; limit: number }> {
  const res = await axiosInstance.get<InternalWorkOrderListResponse>(
    "internal/work-orders/review-queue",
    { params: params ?? {} }
  );
  const data = res.data?.data;
  const rawItems = Array.isArray(data) ? data : (data as { items?: unknown[] })?.items ?? [];
  const items = rawItems
    .map(normalizeItem)
    .filter((r): r is InternalWorkOrderItem => r != null);
  const total = (data as { total?: number })?.total ?? items.length;
  const page = (data as { page?: number })?.page ?? params?.page ?? 1;
  const limit = (data as { limit?: number })?.limit ?? params?.limit ?? 20;
  return { items, total, page, limit };
}

export async function fetchInternalWorkOrderById(
  id: number | string
): Promise<InternalWorkOrderItem | null> {
  const response = await axiosInstance.get<{ success?: boolean; data?: unknown }>(
    `internal/work-orders/${id}`
  );
  const item = normalizeItem(response.data?.data ?? response.data);
  return item ?? null;
}

export async function createInternalWorkOrder(
  body: CreateInternalWorkOrderBody
): Promise<InternalWorkOrderItem> {
  const response = await axiosInstance.post<{ success?: boolean; data?: unknown }>(
    "internal/work-orders",
    body
  );
  const item = normalizeItem(response.data?.data ?? response.data);
  if (!item) {
    throw new Error(getErrorMessage(null, "Unexpected create internal work order response."));
  }
  return item;
}

export async function updateInternalWorkOrder(
  id: number | string,
  body: UpdateInternalWorkOrderBody
): Promise<InternalWorkOrderItem> {
  const response = await axiosInstance.patch<{ success?: boolean; data?: unknown }>(
    `internal/work-orders/${id}`,
    body
  );
  const item = normalizeItem(response.data?.data ?? response.data);
  if (!item) {
    throw new Error(getErrorMessage(null, "Unexpected update internal work order response."));
  }
  return item;
}

export async function reviewInternalWorkOrder(
  id: number | string,
  body: ReviewInternalWorkOrderBody
): Promise<InternalWorkOrderItem> {
  const response = await axiosInstance.patch<{ success?: boolean; data?: unknown }>(
    `internal/work-orders/${id}/review`,
    body
  );
  const item = normalizeItem(response.data?.data ?? response.data);
  if (!item) {
    throw new Error(getErrorMessage(null, "Unexpected review internal work order response."));
  }
  return item;
}

export async function closeInternalWorkOrder(id: number | string): Promise<InternalWorkOrderItem> {
  const response = await axiosInstance.patch<{ success?: boolean; data?: unknown }>(
    `internal/work-orders/${id}/close`
  );
  const item = normalizeItem(response.data?.data ?? response.data);
  if (!item) {
    throw new Error(getErrorMessage(null, "Unexpected close internal work order response."));
  }
  return item;
}

/** Error carrying the server's stable `code`, HTTP status and (for PARTS_UNRESOLVED) the blocking lines. */
export class InternalOrderActionError extends Error {
  code: string | null;
  status: number | null;
  lines: PartsReconciliationLine[];
  constructor(message: string, code: string | null, status: number | null, lines: PartsReconciliationLine[] = []) {
    super(message);
    this.code = code;
    this.status = status;
    this.lines = lines;
  }
}

function toOrderActionError(err: unknown): InternalOrderActionError {
  const r = err as {
    response?: { status?: number; data?: { message?: string; code?: string; errors?: { lines?: unknown } } };
    message?: string;
  };
  return new InternalOrderActionError(
    r.response?.data?.message ?? r.message ?? "Request failed",
    typeof r.response?.data?.code === "string" ? r.response.data.code : null,
    r.response?.status ?? null,
    normalizePartsLines(r.response?.data?.errors?.lines)
  );
}

async function patchOrderAction(id: number | string, action: string, body: Record<string, unknown>): Promise<InternalWorkOrderItem> {
  try {
    const response = await axiosInstance.patch<{ success?: boolean; data?: unknown }>(`internal/work-orders/${id}/${action}`, body);
    const item = normalizeItem(response.data?.data ?? response.data);
    if (!item) throw new Error(`Unexpected ${action} response.`);
    return item;
  } catch (err) {
    throw toOrderActionError(err);
  }
}

const withComment = (comment?: string) => (comment && comment.trim() ? { comment: comment.trim() } : {});

/** Operations Manager confirms (chain orders -> AWAITING_FINAL_CLOSURE; legacy orders still close). */
export const opsConfirmInternalWorkOrder = (id: number | string, comment?: string) =>
  patchOrderAction(id, "ops-confirm", withComment(comment));

/** Operations Manager returns the work to the technician; the comment is mandatory. */
export const opsReturnInternalWorkOrder = (id: number | string, comment: string) =>
  patchOrderAction(id, "ops-return", { comment: comment.trim() });

/**
 * Legacy (V1) workflow step: MAINTENANCE_CLOSED -> AWAITING_OPS_CONFIRMATION. A workflow transition only: the server records who/when
 * and the optional note; it does not touch stock or any warehouse order (returns are confirmed on the warehouse order itself).
 */
export const warehouseReturnInternalWorkOrder = (id: number | string, returnNote?: string) =>
  patchOrderAction(id, "warehouse-return", returnNote && returnNote.trim() ? { returnNote: returnNote.trim() } : {});

/** Maintenance Manager final closure; 409 PARTS_UNRESOLVED carries the blocking lines. */
export const finalCloseInternalWorkOrder = (id: number | string, comment?: string) =>
  patchOrderAction(id, "final-close", withComment(comment));
