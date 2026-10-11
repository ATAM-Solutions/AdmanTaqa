/** Internal Work Orders — GET/PATCH /api/internal/work-orders (Fuel Station only) */

/** Mirrors the backend INTERNAL_WORK_ORDER_STATUS set (unknown future values are kept as-is). */
export type InternalWorkOrderStatus =
  | "DRAFT"
  | "OPEN"
  | "PENDING"
  | "IN_PROGRESS"
  | "UNDER_REVIEW"
  | "MAINTENANCE_CLOSED"
  | "AWAITING_OPS_CONFIRMATION"
  | "CLOSED"
  | "CANCELLED";

export type InternalWorkOrderPriority = "LOW" | "MEDIUM" | "HIGH";

export interface InternalWorkOrderItem {
  id: number;
  title: string;
  branchId?: number | null;
  assetId?: number | null;
  description?: string | null;
  priority?: InternalWorkOrderPriority;
  status: InternalWorkOrderStatus;
  createdAt?: string;
  updatedAt?: string;
  tasks?: InternalTaskRef[];
}

export interface InternalTaskRef {
  id: number;
  title?: string;
  status?: string;
  assignedUserId?: number | null;
  assignedUser?: { id: number; fullName: string; email?: string | null } | null;
}

/** A person who can be given a task on a given order's station (GET /internal-tasks/assignable-users). */
export interface AssignableTechnician {
  id: number;
  fullName: string;
  email?: string | null;
}

export interface InternalWorkOrderListResponse {
  success?: boolean;
  data?:
    | InternalWorkOrderItem[]
    | { items?: InternalWorkOrderItem[]; total?: number; page?: number; limit?: number };
  message?: string;
}

export interface CreateInternalWorkOrderBody {
  title: string;
  branchId?: number;
  assetId?: number;
  description?: string;
  priority?: InternalWorkOrderPriority;
}

export interface UpdateInternalWorkOrderBody {
  title?: string;
  branchId?: number;
  assetId?: number;
  description?: string;
  priority?: InternalWorkOrderPriority;
}

export interface ReviewInternalWorkOrderBody {
  decision: "APPROVE" | "REJECT";
  reason?: string;
}
