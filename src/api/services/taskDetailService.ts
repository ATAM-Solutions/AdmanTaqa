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
  inspectionNotes: string | null;
  reopenReason: string | null;
  station: { id: number; nameEn: string | null; nameAr: string | null; address: string | null } | null;
  order: { id: number; title: string | null; status: string | null; priority: string | null; description: string | null } | null;
  progress: TaskProgress | null;
  activity: TaskActivity[];
  attachments: TaskAttachmentItem[];
}

const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" ? (v as Record<string, unknown>) : null);
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" ? v : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

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
    inspectionNotes: str(r.inspectionNotes),
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
  constructor(message: string, code: string | null, status: number | null) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const toActionError = (err: unknown): TaskActionError => {
  const r = err as { response?: { status?: number; data?: { message?: string; code?: string } }; message?: string };
  return new TaskActionError(
    r.response?.data?.message ?? r.message ?? "Request failed",
    typeof r.response?.data?.code === "string" ? r.response.data.code : null,
    r.response?.status ?? null
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

export interface TaskStatusBody {
  status: string;
  message?: string;
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
    | { kind: "pending"; decision: "APPROVE_UPDATE" | "REJECT_UPDATE"; message?: string }
    | { kind: "submitted"; decision: "APPROVE" | "REJECT"; message?: string; reopenReason?: string }
): Promise<void> {
  try {
    if (action.kind === "pending") {
      await axiosInstance.patch(`internal-tasks/${id}/review-update`, { decision: action.decision, message: action.message });
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
