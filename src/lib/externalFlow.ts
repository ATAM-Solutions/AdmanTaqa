import type { Milestone } from "@/api/services/paymentMilestoneService";

/** Read-only roll-up of an installment schedule, used by the summaries on the RFQ / Quotation / Request pages. */
export interface PaymentProgress {
  total: number;
  settled: number;
  awaitingReport: number;
  awaitingConfirmation: number;
  dueLater: number;
  disputed: number;
  /** percentage of the contract value that is settled (sum of settled installments' percent) */
  settledPercent: number;
  /** who has to move next; null when nothing is waiting on anyone right now */
  waitingOn: "STATION" | "PROVIDER" | null;
}

export function summarizePayments(milestones: Milestone[]): PaymentProgress {
  const p: PaymentProgress = { total: milestones.length, settled: 0, awaitingReport: 0, awaitingConfirmation: 0, dueLater: 0, disputed: 0, settledPercent: 0, waitingOn: null };
  for (const m of milestones) {
    const stage = m.workflow?.stage ?? "DUE_LATER";
    if (stage === "SETTLED") { p.settled += 1; p.settledPercent += Number(m.percent) || 0; }
    else if (stage === "AWAITING_REPORT") p.awaitingReport += 1;
    else if (stage === "AWAITING_RECEIPT_CONFIRMATION") p.awaitingConfirmation += 1;
    else if (stage === "DISPUTED") p.disputed += 1;
    else p.dueLater += 1;
  }
  p.settledPercent = Math.round(p.settledPercent * 100) / 100;
  if (p.awaitingReport > 0) p.waitingOn = "STATION";
  else if (p.awaitingConfirmation > 0) p.waitingOn = "PROVIDER";
  return p;
}

export type NextActionKey =
  | "provider.confirmPayment"
  | "provider.waitStationPayment"
  | "provider.assignOperator"
  | "provider.work"
  | "provider.rework"
  | "provider.waitReview"
  | "station.reportPayment"
  | "station.waitProviderConfirm"
  | "station.legacyPayment"
  | "station.review"
  | "station.waitProviderWork"
  | "station.paymentRejected"
  | "none.cancelled"
  | "none.done"
  | "none.waiting";

export interface NextAction {
  key: NextActionKey;
  /** "you" = the viewer must act on this page; "other" = someone else must; "none" = nothing to do */
  actor: "you" | "other" | "none";
}

interface JobInput {
  side: "provider" | "station";
  status?: string | null;
  paymentRejected?: boolean;
  /** undefined while the schedule is still loading or the viewer may not read payments */
  milestones?: Milestone[];
  /** the single-payment record is awaiting the station and the job has no schedule */
  legacyAwaitingStation?: boolean;
  operatorCount?: number;
}

/**
 * The one thing this viewer should do next on a job order. Payment steps come first (they gate activation and
 * closure), then the execution state. Derived only from data the page already loads; the server still enforces
 * every permission.
 */
export function nextJobAction(i: JobInput): NextAction {
  const { side, status } = i;
  if (status === "CANCELLED") return { key: "none.cancelled", actor: "none" };

  if (i.paymentRejected) return { key: side === "station" ? "station.paymentRejected" : "provider.waitStationPayment", actor: side === "station" ? "you" : "other" };

  const ms = i.milestones ?? [];
  if (side === "provider") {
    if (ms.some((m) => m.workflow?.confirmReceipt.allowed)) return { key: "provider.confirmPayment", actor: "you" };
    if (ms.some((m) => m.workflow?.stage === "AWAITING_REPORT")) return { key: "provider.waitStationPayment", actor: "other" };
  } else {
    if (ms.some((m) => m.workflow?.report.allowed)) return { key: "station.reportPayment", actor: "you" };
    if (ms.some((m) => m.workflow?.stage === "AWAITING_RECEIPT_CONFIRMATION")) return { key: "station.waitProviderConfirm", actor: "other" };
    if (i.legacyAwaitingStation) return { key: "station.legacyPayment", actor: "you" };
  }

  switch (status) {
    case "UNDER_REVIEW":
      return side === "station" ? { key: "station.review", actor: "you" } : { key: "provider.waitReview", actor: "other" };
    case "REWORK_REQUIRED":
      return side === "provider" ? { key: "provider.rework", actor: "you" } : { key: "station.waitProviderWork", actor: "other" };
    case "ACTIVE":
    case "IN_PROGRESS":
    case "WAITING_PARTS":
      if (side === "provider") return (i.operatorCount ?? 1) === 0 ? { key: "provider.assignOperator", actor: "you" } : { key: "provider.work", actor: "you" };
      return { key: "station.waitProviderWork", actor: "other" };
    case "COMPLETED":
    case "CLOSED":
      return { key: "none.done", actor: "none" };
    default:
      return { key: "none.waiting", actor: "none" };
  }
}
