import { describe, expect, it } from "vitest";
import enTasks from "@/i18n/locales/en/tasks.json";
import arTasks from "@/i18n/locales/ar/tasks.json";
import { isCompletionApprovedForTechnician, isCompletionAwaitingReview, technicianStages } from "@/lib/technicianProgress";
import type { TaskProgress } from "@/api/services/taskDetailService";

const stage = (key: string, state: string) => ({ key, state, optional: false, at: null, by: null });
const progress = (over: Partial<TaskProgress>): TaskProgress => ({
  stages: [stage("assigned", "done"), stage("accepted", "done"), stage("on_site", "done"), stage("completed", "upcoming"), stage("under_review", "upcoming"), stage("closed", "upcoming")] as TaskProgress["stages"],
  currentStage: "on_site", status: "IN_PROGRESS", awaitingApproval: false, pendingStage: null, pendingStatus: null, reviewedAt: null, reviewedBy: null, ...over,
} as TaskProgress);
const states = (p: TaskProgress) => technicianStages(p).map((s) => `${s.key}:${s.state}`).join(",");

describe("technician progress is five steps and ends at approval", () => {
  it("working: Submitted/Completed are upcoming", () => {
    expect(states(progress({}))).toBe("assigned:done,accepted:done,in_progress:done,submitted:upcoming,tech_completed:upcoming");
  });
  it("report sent: Submitted current, read-only message, not completed", () => {
    const p = progress({ status: "PENDING_APPROVAL", awaitingApproval: true, pendingStatus: "COMPLETED", pendingStage: "completed" });
    expect(isCompletionAwaitingReview(p)).toBe(true);
    expect(states(p)).toBe("assigned:done,accepted:done,in_progress:done,submitted:current,tech_completed:upcoming");
  });
  it.each(["COMPLETED", "UNDER_REVIEW", "CLOSED"])("approved (%s): Completed, no management stage leaks", (status) => {
    const p = progress({ status, reviewedAt: "2026-11-10T22:55:10Z" });
    expect(isCompletionApprovedForTechnician(p)).toBe(true);
    expect(states(p)).toBe("assigned:done,accepted:done,in_progress:done,submitted:done,tech_completed:done");
    expect(technicianStages(p)).toHaveLength(5);
  });
  it("V1 task #94 (second submission pending after approval) shows Completed, not waiting", () => {
    const p = progress({ status: "PENDING_APPROVAL", awaitingApproval: true, pendingStatus: "UNDER_REVIEW", pendingStage: "under_review", reviewedAt: "2026-11-10T22:55:10Z" });
    expect(isCompletionApprovedForTechnician(p)).toBe(true);
    expect(isCompletionAwaitingReview(p)).toBe(false);
  });
  it("returned to the technician: back to in progress", () => {
    expect(states(progress({ status: "IN_PROGRESS", reviewedAt: null }))).toContain("submitted:upcoming");
  });
  it("labels exist in English and Arabic", () => {
    for (const t of [enTasks, arTasks]) for (const k of ["in_progress", "submitted", "tech_completed"]) expect((t.progress.stages as Record<string, string>)[k]).toBeTruthy();
    expect(arTasks.actions.completionSubmitted).toContain("تم إرسال تقرير الإنجاز — بانتظار مراجعة مدير الصيانة");
  });
});
