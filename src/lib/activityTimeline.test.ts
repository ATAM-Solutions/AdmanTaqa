import { describe, expect, it } from "vitest";
import { actorLabelKey, dayKey, emphasisOf, groupByDay, hasTransition, relatedTaskIds, titleKey } from "./activityTimeline";
import type { ActivityEvent } from "@/types/activity";

const ev = (over: Partial<ActivityEvent> = {}): ActivityEvent => ({
  id: "e1", kind: "TASK_COMMENT", category: "COMMENT", occurredAt: "2026-10-25T10:00:00.000Z", actor: { id: 1, name: "Sara" }, actorLabel: null, side: "STATION",
  from: null, to: null, message: null, important: false, attachments: [], related: {}, meta: {}, ...over,
});

describe("grouping by day", () => {
  it("groups consecutive events of the same local day and keeps the server order", () => {
    const noon = (d: number) => new Date(2026, 9, d, 12, 0).toISOString();
    const events = [ev({ id: "a", occurredAt: noon(24) }), ev({ id: "b", occurredAt: noon(24) }), ev({ id: "c", occurredAt: noon(25) }), ev({ id: "d", occurredAt: noon(24) })];
    const groups = groupByDay(events);
    expect(groups.map((g) => g.events.map((e) => e.id))).toEqual([["a", "b"], ["c"], ["d"]]);
    expect(groups[0].key).toBe(dayKey(noon(24)));
  });
  it("tolerates an unparseable time instead of throwing", () => {
    expect(dayKey("nonsense")).toBe("unknown");
    expect(groupByDay([ev({ occurredAt: "nonsense" })])).toHaveLength(1);
    expect(groupByDay([])).toEqual([]);
  });
});

describe("titles, emphasis and actors", () => {
  it("stage-specific titles come from the server's stage; job events from the event type", () => {
    expect(titleKey(ev({ kind: "REPORT_REJECTED", meta: { stage: "SUPERVISOR" } }))).toBe("REPORT_REJECTED_SUPERVISOR");
    expect(titleKey(ev({ kind: "REPORT_REJECTED" }))).toBe("REPORT_REJECTED");
    expect(titleKey(ev({ kind: "EXTERNAL_REPORT_REVIEWED", meta: { stage: "STATION" } }))).toBe("EXTERNAL_REPORT_REVIEWED_STATION");
    expect(titleKey(ev({ kind: "EXTERNAL_JOB_EVENT", meta: { eventType: "VISIT_COMPLETED" } }))).toBe("jobEvents.VISIT_COMPLETED");
    expect(titleKey(ev({ kind: "TASK_CLOSED" }))).toBe("TASK_CLOSED");
  });
  it("rejections and decisions stand out", () => {
    for (const kind of ["REPORT_REJECTED", "WORK_ORDER_REVIEW_REJECTED", "EXTERNAL_QUOTE_REJECTED", "EXTERNAL_REPORT_REJECTED"]) expect(emphasisOf(ev({ kind, important: true }))).toBe("rejection");
    expect(emphasisOf(ev({ kind: "REPORT_DECIDED_INTERNAL", important: true }))).toBe("decision");
    expect(emphasisOf(ev())).toBe("normal");
  });
  it("shows the person's name, or a safe label saying why there is none", () => {
    expect(actorLabelKey(ev())).toBeNull();
    expect(actorLabelKey(ev({ actor: null, actorLabel: "UNRECORDED" }))).toBe("UNRECORDED");
    expect(actorLabelKey(ev({ actor: null, actorLabel: "PROVIDER" }))).toBe("PROVIDER");
    expect(actorLabelKey(ev({ actor: null, actorLabel: null }))).toBe("UNRECORDED");
    expect(actorLabelKey(ev({ actor: { id: 9, name: null } }))).toBe("UNKNOWN");
  });
  it("a transition needs two different ends; related tasks come from one id or the collapsed list", () => {
    expect(hasTransition(ev({ from: "A", to: "B" }))).toBe(true);
    expect(hasTransition(ev({ from: "A", to: "A" }))).toBe(false);
    expect(hasTransition(ev({ from: null, to: "B" }))).toBe(false);
    expect(relatedTaskIds(ev({ related: { taskId: 4 } }))).toEqual([4]);
    expect(relatedTaskIds(ev({ related: { taskId: 4, taskIds: [1, 2] } }))).toEqual([1, 2]);
    expect(relatedTaskIds(ev())).toEqual([]);
  });
});
