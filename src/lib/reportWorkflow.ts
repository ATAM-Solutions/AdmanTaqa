import type { MaintenanceReport, MaintenanceReportStatus } from "@/types/maintenanceReport";

/**
 * Workflow view-model for a maintenance report (finding 16).
 *
 * Everything is derived from PERSISTED fields only (status, the *At / *ByUser columns, the generated
 * work order / external request). Nothing is inferred beyond what the status itself implies, and a person
 * or time is shown only when it is stored — a stage that the status says is complete but has no stored
 * actor/time is flagged `recorded: false` instead of being given an invented one.
 */
export type StageKey = "submitted" | "supervisor" | "ops" | "decision";
export type StageState = "done" | "current" | "upcoming" | "rejected" | "skipped";
/** Role that is responsible for the step in the report workflow (labels are translated by the UI). */
export type ResponsibleRole = "station_staff" | "regional_supervisor" | "operations_manager" | "maintenance_manager";

export interface WorkflowStage {
  key: StageKey;
  state: StageState;
  role: ResponsibleRole;
  /** Name of the person who acted — only when stored. */
  person: string | null;
  at: string | null;
  note: string | null;
  /** The status implies the step happened but nothing was stored about who/when (legacy rows). */
  recorded: boolean;
  /** decision stage only */
  outcome?: "INTERNAL" | "EXTERNAL";
  link?: { type: "internal" | "external"; id: number; status?: string | null };
}

export interface ReportWorkflow {
  stages: WorkflowStage[];
  /** key of the stage the report is currently waiting at; null when finished or rejected */
  currentKey: StageKey | null;
  terminal: "NONE" | "RESOLVED_INTERNAL" | "RESOLVED_EXTERNAL" | "REJECTED";
  rejectedAtStage: StageKey | null;
}

const ORDER: StageKey[] = ["submitted", "supervisor", "ops", "decision"];
const ROLE: Record<StageKey, ResponsibleRole> = {
  submitted: "station_staff",
  supervisor: "regional_supervisor",
  ops: "operations_manager",
  decision: "maintenance_manager",
};

/** How many stages the status says are completed. */
function completedCount(status: MaintenanceReportStatus): number {
  switch (status) {
    case "SUBMITTED":
      return 1;
    case "SUPERVISOR_APPROVED":
      return 2;
    case "OPS_APPROVED":
      return 3;
    case "RESOLVED_INTERNAL":
    case "RESOLVED_EXTERNAL":
      return 4;
    default:
      return 1;
  }
}

/** Where a REJECTED report stopped, from what was persisted (approval timestamps exist only for approvals). */
export function rejectedStageOf(report: Pick<MaintenanceReport, "supervisorReviewedAt" | "opsApprovedAt">): StageKey {
  if (!report.supervisorReviewedAt) return "supervisor";
  if (!report.opsApprovedAt) return "ops";
  return "decision";
}

export function buildReportWorkflow(report: MaintenanceReport): ReportWorkflow {
  const rejected = report.status === "REJECTED";
  const rejectedAtStage = rejected ? rejectedStageOf(report) : null;
  const done = rejected ? ORDER.indexOf(rejectedAtStage as StageKey) : completedCount(report.status);
  const finished = report.status === "RESOLVED_INTERNAL" || report.status === "RESOLVED_EXTERNAL";

  const persisted: Record<StageKey, { person: string | null; at: string | null; note: string | null }> = {
    submitted: { person: report.SubmittedByUser?.fullName ?? null, at: report.createdAt ?? null, note: null },
    supervisor: { person: report.SupervisorReviewedByUser?.fullName ?? null, at: report.supervisorReviewedAt ?? null, note: report.supervisorNote ?? null },
    ops: { person: report.OpsApprovedByUser?.fullName ?? null, at: report.opsApprovedAt ?? null, note: report.opsNote ?? null },
    decision: { person: report.DecidedByUser?.fullName ?? null, at: report.decidedAt ?? null, note: report.decisionNote ?? null },
  };

  const stages: WorkflowStage[] = ORDER.map((key, index) => {
    let state: StageState;
    if (rejected) {
      if (index < done) state = "done";
      else if (index === done) state = "rejected";
      else state = "skipped";
    } else if (index < done) state = "done";
    else if (index === done && !finished) state = "current";
    else state = "upcoming";

    const p = persisted[key];
    let person = p.person;
    let at = p.at;
    let note = p.note;
    if (state === "rejected") {
      // The rejection is recorded on the dedicated rejected* columns, not on the stage's approval columns.
      person = report.RejectedByUser?.fullName ?? null;
      at = report.rejectedAt ?? null;
      note = report.rejectionNote ?? null;
    }
    const mustBeRecorded = state === "done" || state === "rejected";
    const recorded = !mustBeRecorded || key === "submitted" || at != null || person != null;
    const stage: WorkflowStage = {
      key,
      state,
      role: ROLE[key],
      person: state === "upcoming" || state === "current" || state === "skipped" ? null : person,
      at: state === "upcoming" || state === "current" || state === "skipped" ? null : at,
      note: state === "upcoming" || state === "current" || state === "skipped" ? null : note,
      recorded,
    };

    if (key === "decision" && state === "done") {
      const outcome = report.decisionType ?? (report.status === "RESOLVED_EXTERNAL" ? "EXTERNAL" : report.status === "RESOLVED_INTERNAL" ? "INTERNAL" : undefined);
      if (outcome) stage.outcome = outcome;
      if (outcome === "INTERNAL" && report.InternalWorkOrder) {
        stage.link = { type: "internal", id: report.InternalWorkOrder.id, status: report.InternalWorkOrder.status };
      } else if (outcome === "EXTERNAL" && report.ExternalRequest) {
        stage.link = { type: "external", id: report.ExternalRequest.id, status: report.ExternalRequest.status };
      }
    }
    return stage;
  });

  const current = stages.find((s) => s.state === "current");
  return {
    stages,
    currentKey: current?.key ?? null,
    terminal: rejected ? "REJECTED" : report.status === "RESOLVED_INTERNAL" ? "RESOLVED_INTERNAL" : report.status === "RESOLVED_EXTERNAL" ? "RESOLVED_EXTERNAL" : "NONE",
    rejectedAtStage,
  };
}
