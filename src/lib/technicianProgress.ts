import type { TaskProgress, TaskProgressStage } from "@/api/services/taskDetailService";

/** Statuses a task holds once the Maintenance Manager approved its completion report. */
const APPROVED_STATUSES = ["COMPLETED", "UNDER_REVIEW", "RETURNING_MATERIALS", "CLOSED"];

/** The technician's report was approved: their part of the job is finished (later review/closure is management's). */
export function isCompletionApprovedForTechnician(progress: TaskProgress | null | undefined): boolean {
  if (!progress) return false;
  if (progress.status === "CLOSED") return true;
  if (!progress.reviewedAt) return false;
  if (APPROVED_STATUSES.includes(progress.status)) return true;
  // V1: the technician's second "submit for review" waits on a second approval; the first one already finished their part
  return progress.status === "PENDING_APPROVAL" && (progress.pendingStatus === "UNDER_REVIEW" || progress.pendingStatus === "RETURNING_MATERIALS");
}

/** The completion report was sent and waits for the Maintenance Manager (first submission, or a resubmission after a return). */
export function isCompletionAwaitingReview(progress: TaskProgress | null | undefined): boolean {
  return !!progress && progress.status === "PENDING_APPROVAL" && progress.pendingStatus === "COMPLETED";
}

/**
 * Five-step technician view: Assigned, Accepted, In progress, Submitted for review, Completed.
 * Management closure (Under review / Closed) is not a technician step, so those server stages are folded in:
 * the technician's job ends when the report is approved.
 */
export function technicianStages(progress: TaskProgress): TaskProgressStage[] {
  const byKey = new Map(progress.stages.map((s) => [s.key, s]));
  const base = (key: string): TaskProgressStage => byKey.get(key) ?? { key, state: "upcoming", optional: false, at: null, by: null };
  const approved = isCompletionApprovedForTechnician(progress);
  const awaiting = isCompletionAwaitingReview(progress);
  const done = base("completed");
  const onSite = base("on_site");
  const workFinished = approved || awaiting;
  const submittedState: TaskProgressStage["state"] = approved ? "done" : awaiting ? "current" : "upcoming";
  const inProgressState: TaskProgressStage["state"] = workFinished
    ? "done"
    : onSite.state === "unknown" ? "unknown" : onSite.state === "awaiting_approval" ? "current" : onSite.state;
  return [
    base("assigned"),
    base("accepted"),
    { ...onSite, key: "in_progress", state: inProgressState },
    { key: "submitted", state: submittedState, optional: false, at: approved || awaiting ? done.at ?? progress.reviewedAt : null, by: null },
    { key: "tech_completed", state: approved ? "done" : "upcoming", optional: false, at: approved ? progress.reviewedAt : null, by: approved ? progress.reviewedBy : null },
  ];
}
