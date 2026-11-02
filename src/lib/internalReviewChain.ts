import type { InternalWorkOrderItem } from "@/types/internalWorkOrder";

/** Chain orders (workflowVersion >= 2, not legacy) use the Maintenance -> Operations -> final-closure review chain. */
export function isChainOrder(order: Pick<InternalWorkOrderItem, "workflow" | "workflowVersion"> | null | undefined): boolean {
  if (!order) return false;
  if (order.workflow) return order.workflow.legacy === false && order.workflow.version >= 2;
  return (order.workflowVersion ?? 1) >= 2;
}

/**
 * Legacy order whose every open task is already COMPLETED (and approved) but the order never reached UNDER_REVIEW:
 * the old "stuck" case. The legacy Approve/Reject review is valid for it.
 */
export function isStuckLegacyInProgress(order: Pick<InternalWorkOrderItem, "status" | "tasks" | "workflow" | "workflowVersion">): boolean {
  if (isChainOrder(order) || order.status !== "IN_PROGRESS") return false;
  const open = (order.tasks ?? []).filter((t) => t.status !== "CLOSED");
  return (order.tasks ?? []).length > 0 && open.every((t) => t.status === "COMPLETED");
}

export interface OrderActionFlags {
  chain: boolean;
  /** Legacy Approve / Reject (UNDER_REVIEW, or the stuck IN_PROGRESS case). */
  legacyReview: boolean;
  stuckLegacy: boolean;
  /** Legacy single-step Operations closure (AWAITING_OPS_CONFIRMATION). */
  legacyClose: boolean;
  opsConfirm: boolean;
  opsReturn: boolean;
  finalClose: boolean;
}

export function orderActionFlags(
  order: Pick<InternalWorkOrderItem, "status" | "tasks" | "workflow" | "workflowVersion">,
  can: { review: boolean; opsConfirm: boolean }
): OrderActionFlags {
  const chain = isChainOrder(order);
  const stuckLegacy = isStuckLegacyInProgress(order);
  return {
    chain,
    stuckLegacy,
    legacyReview: !chain && can.review && (order.status === "UNDER_REVIEW" || stuckLegacy),
    legacyClose: !chain && can.opsConfirm && order.status === "AWAITING_OPS_CONFIRMATION",
    opsConfirm: chain && can.opsConfirm && order.status === "AWAITING_OPS_CONFIRMATION",
    opsReturn: chain && can.opsConfirm && order.status === "AWAITING_OPS_CONFIRMATION",
    finalClose: chain && can.review && order.status === "AWAITING_FINAL_CLOSURE",
  };
}

/** The technician's second "submit for review" step does not exist on chain orders (approval hands the order on). */
export function techActionsForOrder<T extends { id: string }>(actions: T[], workflowVersion: number | null | undefined): T[] {
  return (workflowVersion ?? 1) >= 2 ? actions.filter((a) => a.id !== "submitReview") : actions;
}

/** A returned technician report needs a comment on chain orders. */
export function reviewReturnNeedsComment(workflowVersion: number | null | undefined): boolean {
  return (workflowVersion ?? 1) >= 2;
}

/** Status of the order that follows an approved task in a chain order -> translation key suffix, or null. */
export function chainHandoffStatus(orderStatus: string | null | undefined): "AWAITING_OPS_CONFIRMATION" | "AWAITING_FINAL_CLOSURE" | null {
  return orderStatus === "AWAITING_OPS_CONFIRMATION" || orderStatus === "AWAITING_FINAL_CLOSURE" ? orderStatus : null;
}
