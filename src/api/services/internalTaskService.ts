import axiosInstance from "@/api/config";
import type { AssignableTechnician } from "@/types/internalWorkOrder";
import type {
  CreateInternalTaskBody,
  InternalTaskItem,
  InternalTasksApiResponse,
  InternalTasksListData,
  InternalTasksQuery,
  InternalTaskStatus,
  ReviewInternalTaskBody,
  UpdateInternalTaskStatusBody,
} from "@/types/internalTask";

const toObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const toStringOrNull = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const toNumberOrNull = (value: unknown): number | null =>
  typeof value === "number" ? value : null;

const toStatus = (value: unknown): InternalTaskStatus => {
  if (
    value === "ASSIGNED" ||
    value === "IN_PROGRESS" ||
    value === "PAUSED" ||
    value === "WAITING_PARTS" ||
    value === "COMPLETED" ||
    value === "CLOSED"
  ) {
    return value;
  }
  return "ASSIGNED";
};

const normalizeTask = (raw: unknown): InternalTaskItem | null => {
  const obj = toObject(raw);
  if (!obj || (typeof obj.id !== "number" && typeof obj.id !== "string")) return null;
  if (typeof obj.workOrderId !== "number" && typeof obj.workOrderId !== "string") return null;

  const attachmentsRaw = Array.isArray(obj.attachments)
    ? obj.attachments
    : Array.isArray(obj.Attachments)
    ? obj.Attachments
    : [];

  const attachments = attachmentsRaw
    .map((attachmentRaw) => {
      const attachmentObj = toObject(attachmentRaw);
      if (!attachmentObj) return null;
      const id = attachmentObj.id;
      if (typeof id !== "string" && typeof id !== "number") return null;
      return {
        id,
        url: toStringOrNull(attachmentObj.url) ?? undefined,
        fileUrl:
          toStringOrNull(attachmentObj.fileUrl) ??
          toStringOrNull(attachmentObj.file_path) ??
          undefined,
        fileName: toStringOrNull(attachmentObj.fileName) ?? undefined,
        createdAt: toStringOrNull(attachmentObj.createdAt) ?? undefined,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const reviewDecision =
    obj.reviewDecision === "APPROVED" || obj.reviewDecision === "REJECTED"
      ? obj.reviewDecision
      : null;

  return {
    id: obj.id,
    workOrderId: obj.workOrderId as number | string,
    title: toStringOrNull(obj.title),
    description: toStringOrNull(obj.description),
    assignedUserId: toNumberOrNull(obj.assignedUserId),
    status: toStatus(obj.status),
    reviewDecision,
    note: toStringOrNull(obj.note),
    attachments,
    createdAt:
      typeof obj.createdAt === "string" ? obj.createdAt : new Date().toISOString(),
    updatedAt: toStringOrNull(obj.updatedAt) ?? undefined,
  };
};

const normalizeTasksList = (
  payload: unknown,
  page = 1,
  limit = 20
): InternalTasksListData => {
  const root = toObject(payload);
  const data = toObject(root?.data) ?? root;
  const itemsRaw = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data)
    ? data
    : [];

  const items = itemsRaw
    .map(normalizeTask)
    .filter((row): row is InternalTaskItem => row !== null);

  return {
    items,
    total: typeof data?.total === "number" ? data.total : items.length,
    page: typeof data?.page === "number" ? data.page : page,
    limit: typeof data?.limit === "number" ? data.limit : limit,
  };
};

const getErrorMessage = (err: unknown, fallback: string) => {
  const withResponse = err as { response?: { data?: { message?: string } } };
  return typeof withResponse.response?.data?.message === "string"
    ? withResponse.response.data.message
    : err instanceof Error
    ? err.message
    : fallback;
};

export async function fetchInternalTasks(
  query: InternalTasksQuery
): Promise<InternalTasksListData> {
  try {
    const params: Record<string, string | number> = {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    };
    if (query.workOrderId != null) params.workOrderId = query.workOrderId;
    if (query.status && query.status !== "all") params.status = query.status;

    const response = await axiosInstance.get<InternalTasksApiResponse>("internal-tasks", {
      params,
    });
    return normalizeTasksList(response.data, query.page, query.limit);
  } catch (err) {
    throw new Error(getErrorMessage(err, "Failed to fetch internal tasks."));
  }
}

export async function fetchMyInternalTasks(
  page = 1,
  limit = 20
): Promise<InternalTasksListData> {
  try {
    const response = await axiosInstance.get<InternalTasksApiResponse>("internal-tasks/my", {
      params: { page, limit },
    });
    return normalizeTasksList(response.data, page, limit);
  } catch (err) {
    throw new Error(getErrorMessage(err, "Failed to fetch my internal tasks."));
  }
}

export async function fetchInternalTaskReviewQueue(
  page = 1,
  limit = 20
): Promise<InternalTasksListData> {
  try {
    const response = await axiosInstance.get<InternalTasksApiResponse>(
      "internal-tasks/review-queue",
      {
        params: { page, limit },
      }
    );
    return normalizeTasksList(response.data, page, limit);
  } catch (err) {
    throw new Error(getErrorMessage(err, "Failed to fetch internal task review queue."));
  }
}

export async function createInternalTask(
  body: CreateInternalTaskBody
): Promise<InternalTaskItem> {
  try {
    const response = await axiosInstance.post<InternalTasksApiResponse>("internal-tasks", body);
    const item = normalizeTask(response.data?.data ?? response.data);
    if (!item) throw new Error("Unexpected create internal task response.");
    return item;
  } catch (err) {
    throw new Error(getErrorMessage(err, "Failed to create internal task."));
  }
}

export async function updateInternalTaskStatus(
  id: number | string,
  body: UpdateInternalTaskStatusBody
): Promise<InternalTaskItem> {
  try {
    const response = await axiosInstance.patch<InternalTasksApiResponse>(
      `internal-tasks/${id}/status`,
      body
    );
    const item = normalizeTask(response.data?.data ?? response.data);
    if (!item) throw new Error("Unexpected update status response.");
    return item;
  } catch (err) {
    throw new Error(getErrorMessage(err, "Failed to update internal task status."));
  }
}

export async function reviewInternalTask(
  id: number | string,
  body: ReviewInternalTaskBody
): Promise<InternalTaskItem> {
  try {
    const response = await axiosInstance.patch<InternalTasksApiResponse>(
      `internal-tasks/${id}/review`,
      body
    );
    const item = normalizeTask(response.data?.data ?? response.data);
    if (!item) throw new Error("Unexpected review internal task response.");
    return item;
  } catch (err) {
    throw new Error(getErrorMessage(err, "Failed to review internal task."));
  }
}

export async function closeInternalTask(
  id: number | string,
  note?: string
): Promise<InternalTaskItem> {
  try {
    const response = await axiosInstance.patch<InternalTasksApiResponse>(
      `internal-tasks/${id}/close`,
      note ? { note } : undefined
    );
    const item = normalizeTask(response.data?.data ?? response.data);
    if (!item) throw new Error("Unexpected close internal task response.");
    return item;
  } catch (err) {
    throw new Error(getErrorMessage(err, "Failed to close internal task."));
  }
}

export async function uploadInternalTaskAttachment(
  id: number | string,
  file: File
): Promise<InternalTaskItem> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await axiosInstance.post<InternalTasksApiResponse>(
      `internal-tasks/${id}/attachments`,
      formData
    );
    const item = normalizeTask(response.data?.data ?? response.data);
    if (!item) throw new Error("Attachment uploaded, but response shape was unexpected.");
    return item;
  } catch (err) {
    throw new Error(getErrorMessage(err, "Failed to upload attachment."));
  }
}

/** Error that keeps the server's stable `code` so the UI can translate it. */
export class AssignmentError extends Error {
  code: string | null;
  status: number | null;
  constructor(message: string, code: string | null, status: number | null) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const toAssignmentError = (err: unknown, fallback: string) => {
  const r = err as { response?: { status?: number; data?: { message?: string; code?: string } } };
  return new AssignmentError(
    r.response?.data?.message ?? (err instanceof Error ? err.message : fallback),
    typeof r.response?.data?.code === "string" ? r.response.data.code : null,
    r.response?.status ?? null
  );
};

/** Technicians of the order's company who can work at the order's station (server-filtered). */
export async function fetchAssignableTechnicians(
  internalWorkOrderId: number | string
): Promise<AssignableTechnician[]> {
  try {
    const response = await axiosInstance.get<{ data?: unknown }>("internal-tasks/assignable-users", {
      params: { internalWorkOrderId },
    });
    const rows = Array.isArray(response.data?.data) ? (response.data.data as unknown[]) : [];
    return rows
      .map((r) => r as Record<string, unknown>)
      .filter((r) => typeof r.id === "number")
      .map((r) => ({
        id: r.id as number,
        fullName: typeof r.fullName === "string" ? r.fullName : `#${r.id}`,
        email: typeof r.email === "string" ? r.email : null,
      }));
  } catch (err) {
    throw toAssignmentError(err, "Failed to load technicians.");
  }
}

/** Create a task on an internal work order and assign it (POST /internal-tasks). */
export async function assignWorkerToOrder(body: {
  internalWorkOrderId: number | string;
  assignedUserId: number;
  notes?: string;
}): Promise<void> {
  try {
    await axiosInstance.post("internal-tasks", body);
  } catch (err) {
    throw toAssignmentError(err, "Failed to assign the worker.");
  }
}

/** Move an existing task to another technician (PATCH /internal-tasks/:id/reassign). */
export async function reassignInternalTask(
  taskId: number | string,
  assignedUserId: number
): Promise<void> {
  try {
    await axiosInstance.patch(`internal-tasks/${taskId}/reassign`, { assignedUserId });
  } catch (err) {
    throw toAssignmentError(err, "Failed to reassign the task.");
  }
}
