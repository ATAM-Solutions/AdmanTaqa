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
  | "AWAITING_FINAL_CLOSURE"
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
  /** Files of the report this order was created from (read-only); null when it has no source report. */
  sourceReport?: import("@/types/sourceReport").SourceReport | null;
  /** 1 = legacy flow, 2 = review chain. Absent on older servers (treated as legacy). */
  workflowVersion?: number;
  closedAt?: string | null;
  closedByUserId?: number | null;
  workflow?: InternalWorkflowState | null;
  partsReconciliation?: PartsReconciliation | null;
  reviewHistory?: ReviewHistoryEntry[];
  /** Per-viewer authorization computed by the server (same rules as the routes). Absent on older servers. */
  viewerActions?: { operations?: ViewerOperations } | null;
}

export type ViewerOperationsReason = "MISSING_PERMISSION" | "TECHNICIAN_ROLE_RESTRICTED" | "OPERATIONS_ROLE_REQUIRED" | "SEPARATION_OF_DUTIES" | (string & {});

export interface ViewerOperations {
  confirm: { allowed: boolean; reason: ViewerOperationsReason | null; ownerOverride?: boolean };
  return: { allowed: boolean; reason: ViewerOperationsReason | null };
}

export type InternalWorkflowStage =
  | "NOT_STARTED"
  | "IN_EXECUTION"
  | "AWAITING_MAINTENANCE_REVIEW"
  | "AWAITING_OPERATIONS_REVIEW"
  | "AWAITING_FINAL_CLOSURE"
  | "AWAITING_WAREHOUSE_RETURN"
  | "CLOSED"
  | (string & {});

export type ReviewChainActor = "TECHNICIAN" | "MAINTENANCE_MANAGER" | "OPERATIONS_MANAGER";

export interface InternalWorkflowState {
  version: number;
  legacy: boolean;
  stage: InternalWorkflowStage;
  nextActor: ReviewChainActor | null;
  partsBlockingClosure: boolean;
  canFinalClose: boolean;
}

export type PartsBlocker = "AWAITING_RECEIPT" | "USAGE_NOT_CONFIRMED" | "RETURN_NOT_RECORDED" | "RETURN_AWAITING_WAREHOUSE";

export interface PartsReconciliationLine {
  warehouseOrderId: number | null;
  warehouseOrderStatus: string | null;
  assignedTechnicianId: number | null;
  itemId: number | null;
  partName: string;
  issued: number;
  /** null while the technician has not confirmed receipt. */
  received: number | null;
  /** null until the technician states it. */
  used: number | null;
  returned: number;
  returnPending: number;
  unresolved: number;
  shortfall: number;
  usageConfirmed: boolean;
  blockers: PartsBlocker[];
}

export interface PartsReconciliation {
  hasIssuedParts: boolean;
  blocking: boolean;
  blockingLines: number;
  totals: { issued: number; received: number; used: number; returned: number; returnPending: number; unresolved: number };
  lines: PartsReconciliationLine[];
}

export interface ReviewHistoryEntry {
  id: number;
  stage: "MAINTENANCE_REVIEW" | "OPERATIONS_REVIEW" | "FINAL_CLOSURE" | (string & {});
  decision: "APPROVED" | "RETURNED" | "CLOSED" | (string & {});
  comment: string | null;
  internalTaskId: number | null;
  actor: { id: number; fullName: string } | null;
  createdAt: string;
}

export interface InternalTaskRef {
  id: number;
  title?: string;
  status?: string;
  assignedUserId?: number | null;
  /** Server-computed progress (same payload the mobile app uses). */
  progress?: import("@/api/services/taskDetailService").TaskProgress | null;
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
