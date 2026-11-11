import axiosInstance from "@/api/config";
import { resolveMediaUrl } from "@/lib/media";

export type ProgressStageState = "done" | "current" | "awaiting_approval" | "upcoming" | "unknown";

export interface TaskProgressStage {
  key: string;
  state: ProgressStageState;
  optional: boolean;
  at: string | null;
  by: { id: number; fullName: string | null } | null;
}

export interface TaskProgress {
  stages: TaskProgressStage[];
  currentStage: string | null;
  status: string;
  awaitingApproval: boolean;
  pendingStage: string | null;
  pendingStatus: string | null;
  reviewedAt: string | null;
  reviewedBy: { id: number; fullName: string | null } | null;
}

export interface TaskActivity {
  id: number;
  type: string;
  message: string | null;
  oldStatus: string | null;
  newStatus: string | null;
  createdAt: string;
  by: string | null;
}

export interface TaskAttachmentItem {
  id: number;
  url: string | null;
  fileType: string | null;
  category: string | null;
  caption: string | null;
  createdAt: string | null;
  by: string | null;
}

export interface TaskDetailData {
  id: number;
  status: string;
  pendingStatus: string | null;
  notes: string | null;
  assignedUserId: number | null;
  assignee: string | null;
  assignedBy: string | null;
  createdAt: string | null;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  closedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  completionReport: string | null;
  /** Saved with the approved completion / materials-return reports (shown so nothing the technician wrote stays hidden). */
  materialsUsedSummary: string | null;
  materialsReturnedSummary: string | null;
  returnReportProblem: string | null;
  returnReportWorkPerformed: string | null;
  /** What the technician sent with a still-undecided "return materials" request. */
  pendingReturnReport: string | null;
  inspectionNotes: string | null;
  /** Notes the technician sent with a still-undecided inspection request. */
  pendingInspectionNotes: string | null;
  /** The completion report (and free comment) the technician sent with a still-undecided "work completed" request. */
  pendingCompletionReport: string | null;
  reopenReason: string | null;
  station: { id: number; nameEn: string | null; nameAr: string | null; address: string | null } | null;
  order: { id: number; title: string | null; status: string | null; priority: string | null; description: string | null; workflowVersion: number } | null;
  progress: TaskProgress | null;
  activity: TaskActivity[];
  attachments: TaskAttachmentItem[];
}

const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" ? (v as Record<string, unknown>) : null);
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" ? v : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function pendingInspectionNotes(r: Record<string, unknown>): string | null {
  if (r.status !== "PENDING_APPROVAL" || r.pendingStatus !== "INSPECTING") return null;
  const raw = r.pendingPayload;
  try {
    const p = typeof raw === "string" ? JSON.parse(raw) : raw;
    return str(obj(p)?.inspectionNotes)?.trim() || str(r.pendingDescription);
  } catch {
    return str(r.pendingDescription);
  }
}

function pendingCompletionReport(r: Record<string, unknown>): string | null {
  if (r.status !== "PENDING_APPROVAL" || r.pendingStatus !== "COMPLETED") return null;
  let p: Record<string, unknown> | null = null;
  try {
    const raw = r.pendingPayload;
    p = obj(typeof raw === "string" ? JSON.parse(raw) : raw);
  } catch {
    p = null;
  }
  const parts = [str(p?.completionReport)?.trim(), str(p?.message)?.trim()].filter((x): x is string => !!x);
  if (parts.length === 2 && parts[0] === parts[1]) parts.pop();
  return parts.length ? parts.join("\n\n") : str(r.pendingDescription);
}

function pendingReturnReport(r: Record<string, unknown>): string | null {
  if (r.status !== "PENDING_APPROVAL" || r.pendingStatus !== "RETURNING_MATERIALS") return null;
  let p: Record<string, unknown> | null = null;
  try {
    const raw = r.pendingPayload;
    p = obj(typeof raw === "string" ? JSON.parse(raw) : raw);
  } catch {
    p = null;
  }
  const parts = [str(p?.returnReportProblem)?.trim(), str(p?.returnReportWorkPerformed)?.trim()].filter((x): x is string => !!x);
  return parts.length ? parts.join("\n\n") : str(r.pendingDescription);
}

export function normalizeTaskDetail(raw: unknown): TaskDetailData | null {
  const r = obj(raw);
  if (!r || typeof r.id !== "number") return null;
  const branch = obj(r.Branch);
  const iwo = obj(r.InternalWorkOrder);
  const wo = obj(r.WorkOrder);
  const orderRaw = iwo ?? wo;
  const progress = obj(r.progress);
  return {
    id: r.id,
    status: str(r.status) ?? "ASSIGNED",
    pendingStatus: str(r.pendingStatus),
    notes: str(r.notes),
    assignedUserId: num(r.assignedUserId),
    assignee: str(obj(r.AssignedUser)?.fullName),
    assignedBy: str(obj(r.AssignedByUser)?.fullName),
    createdAt: str(r.createdAt),
    acceptedAt: str(r.acceptedAt),
    startedAt: str(r.startedAt),
    completedAt: str(r.completedAt),
    closedAt: str(r.closedAt),
    reviewedAt: str(r.reviewedAt),
    reviewedBy: str(obj(r.ReviewedByUser)?.fullName),
    completionReport: str(r.completionReport),
    materialsUsedSummary: str(r.materialsUsedSummary),
    materialsReturnedSummary: str(r.materialsReturnedSummary),
    returnReportProblem: str(r.returnReportProblem),
    returnReportWorkPerformed: str(r.returnReportWorkPerformed),
    pendingReturnReport: pendingReturnReport(r),
    inspectionNotes: str(r.inspectionNotes),
    pendingInspectionNotes: pendingInspectionNotes(r),
    pendingCompletionReport: pendingCompletionReport(r),
    reopenReason: str(r.reopenReason),
    station: branch && typeof branch.id === "number"
      ? { id: branch.id, nameEn: str(branch.nameEn), nameAr: str(branch.nameAr), address: str(branch.address) }
      : null,
    order: orderRaw && typeof orderRaw.id === "number"
      ? {
          id: orderRaw.id as number,
          title: str(orderRaw.title),
          status: str(orderRaw.status),
          priority: str(orderRaw.priority),
          description: str(orderRaw.description),
          workflowVersion: num(orderRaw.workflowVersion) ?? 1,
        }
      : null,
    progress: progress && Array.isArray(progress.stages) ? (progress as unknown as TaskProgress) : null,
    activity: arr(r.TaskUpdates)
      .map(obj)
      .filter((u): u is Record<string, unknown> => !!u && typeof u.id === "number")
      .map((u) => ({
        id: u.id as number,
        type: str(u.type) ?? "COMMENT",
        message: str(u.message),
        oldStatus: str(u.oldStatus),
        newStatus: str(u.newStatus),
        createdAt: str(u.createdAt) ?? "",
        by: str(obj(u.CreatedByUser)?.fullName),
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    attachments: arr(r.TaskAttachments)
      .map(obj)
      .filter((a): a is Record<string, unknown> => !!a && typeof a.id === "number")
      .map((a) => ({
        id: a.id as number,
        url: resolveMediaUrl(str(a.fileUrl)),
        fileType: str(a.fileType),
        category: str(a.category),
        caption: str(a.caption),
        createdAt: str(a.createdAt),
        by: str(obj(a.UploadedByUser)?.fullName),
      })),
  };
}

/** Error carrying the server's stable `code` and HTTP status so the UI can translate and react. */
export class TaskActionError extends Error {
  code: string | null;
  status: number | null;
  /** The server's `errors` payload (e.g. the warehouse candidates of WAREHOUSE_SELECTION_REQUIRED). */
  details: Record<string, unknown> | null;
  constructor(message: string, code: string | null, status: number | null, details: Record<string, unknown> | null = null) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const toActionError = (err: unknown): TaskActionError => {
  const r = err as { response?: { status?: number; data?: { message?: string; code?: string; errors?: Record<string, unknown> } }; message?: string };
  return new TaskActionError(
    r.response?.data?.message ?? r.message ?? "Request failed",
    typeof r.response?.data?.code === "string" ? r.response.data.code : null,
    r.response?.status ?? null,
    r.response?.data?.errors && typeof r.response.data.errors === "object" ? r.response.data.errors : null
  );
};

export async function fetchTaskDetail(id: number | string): Promise<TaskDetailData> {
  try {
    const res = await axiosInstance.get(`internal-tasks/${id}`);
    const task = normalizeTaskDetail(obj(res.data)?.data);
    if (!task) throw new Error("Unexpected task response");
    return task;
  } catch (err) {
    throw toActionError(err);
  }
}

export interface RequestedPart {
  sparePartId: number;
  quantity: number;
}

export interface TaskStatusBody {
  status: string;
  message?: string;
  /** Parts picked from the warehouse catalogue (a request for spare parts). */
  requestedItems?: RequestedPart[];
  completionReport?: string;
  inspectionNotes?: string;
  materialsUsedSummary?: string;
  returnReportProblem?: string;
  returnReportWorkPerformed?: string;
}

export async function submitTaskStatus(id: number | string, body: TaskStatusBody): Promise<void> {
  try {
    await axiosInstance.patch(`internal-tasks/${id}/status`, body);
  } catch (err) {
    throw toActionError(err);
  }
}

/** Reviewer decision on a task awaiting the manager: distinct endpoints for the two situations. */
export async function submitTaskReview(
  id: number | string,
  action:
    | { kind: "pending"; decision: "APPROVE_UPDATE" | "REJECT_UPDATE"; message?: string; warehouseId?: number }
    | { kind: "submitted"; decision: "APPROVE" | "REJECT"; message?: string; reopenReason?: string }
): Promise<void> {
  try {
    if (action.kind === "pending") {
      await axiosInstance.patch(`internal-tasks/${id}/review-update`, { decision: action.decision, message: action.message, warehouseId: action.warehouseId });
    } else {
      await axiosInstance.patch(`internal-tasks/${id}/review`, {
        decision: action.decision,
        message: action.message,
        reopenReason: action.reopenReason,
      });
    }
  } catch (err) {
    throw toActionError(err);
  }
}

export async function uploadTaskAttachment(id: number | string, file: File, category: string): Promise<void> {
  try {
    const form = new FormData();
    form.append("file", file);
    form.append("category", category);
    await axiosInstance.post(`internal-tasks/${id}/attachments`, form);
  } catch (err) {
    throw toActionError(err);
  }
}

export interface SparePartOption {
  id: number;
  name: string;
  code: string | null;
  unit: string | null;
  category: string | null;
}
export interface SparePartWarehouse {
  id: number;
  name: string;
  items: SparePartOption[];
}

/** The warehouse catalogue a technician may pick from for this task (names only; the server never sends stock levels here). */
export async function fetchTaskSpareParts(id: number | string): Promise<SparePartWarehouse[]> {
  try {
    const res = await axiosInstance.get(`internal-tasks/${id}/spare-parts`);
    return arr(obj(obj(res.data)?.data)?.warehouses)
      .map(obj)
      .filter((w): w is Record<string, unknown> => !!w && typeof w.id === "number")
      .map((w) => ({
        id: w.id as number,
        name: str(w.name) ?? `#${w.id}`,
        items: arr(w.items)
          .map(obj)
          .filter((i): i is Record<string, unknown> => !!i && typeof i.id === "number")
          .map((i) => ({ id: i.id as number, name: str(i.name) ?? "", code: str(i.code), unit: str(i.unit), category: str(i.category) })),
      }));
  } catch (err) {
    throw toActionError(err);
  }
}

// ── Spare-parts requests linked to a task / work order (Bug #8) ─────────────────────────────────────────────────
export interface BilingualText { en: string; ar: string }
export interface SparePartRequestItem {
  id: number;
  partName: string | null;
  partCode?: string | null;
  unit?: string | null;
  quantity: number;
  approvedQuantity?: number | null;
  issuedQuantity?: number | null;
  receivedQuantity?: number | null;
  usedQuantity?: number | null;
  returnedQuantity?: number | null;
  status?: string;
}
export interface SparePartRequest {
  requestId: number | null;
  warehouseOrderId: number | null;
  taskId: number | null;
  internalWorkOrderId: number | null;
  requestedBy: { id: number; fullName: string | null } | null;
  requestedAt: string | null;
  items: SparePartRequestItem[];
  status: string;
  phase: string;
  statusLabel: BilingualText;
  maintenanceApproval: { decision: "PENDING" | "APPROVED" | "REJECTED"; by: { id: number; fullName: string | null } | null; at: string | null; reason?: string | null };
  warehouse: { id: number; name: string } | null;
  nextAction: { role: string; label: BilingualText; routing: "ROLE_QUEUE" | "ASSIGNED_MANAGERS" | "ASSIGNED_USER" } | null;
  responsibleUsers: { id: number; fullName: string | null }[];
  canOpenWarehouseOrder: boolean;
  timeline: { id: number; type: string; oldStatus: string | null; newStatus: string | null; message: string | null; by: { id: number; fullName: string | null } | null; at: string }[];
}

export async function fetchSparePartRequests(root: "task" | "workOrder", id: number | string): Promise<SparePartRequest[]> {
  try {
    const path = root === "task" ? `internal-tasks/${id}/spare-part-requests` : `internal/work-orders/${id}/spare-part-requests`;
    const res = await axiosInstance.get(path);
    const list = obj(obj(res.data)?.data)?.requests;
    return Array.isArray(list) ? (list as SparePartRequest[]) : [];
  } catch (err) {
    throw toActionError(err);
  }
}
