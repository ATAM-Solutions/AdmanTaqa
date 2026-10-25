import type { ActivityEvent } from "@/types/activity";

/** Pure presentation rules of the activity timeline. The server decides what an event is; this only decides how to show it. */

/** Local calendar day of an instant ("2026-10-25"), used to group events under one date heading. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface DayGroup {
  key: string;
  events: ActivityEvent[];
}

/** Groups consecutive events of the same day, keeping the server's order (the timeline is already sorted). */
export function groupByDay(events: readonly ActivityEvent[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const e of events) {
    const key = dayKey(e.occurredAt);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.events.push(e);
    else groups.push({ key, events: [e] });
  }
  return groups;
}

/** Translation key (under `kinds.`) of an event's title; stage-specific titles are looked up by the server-provided stage. */
export function titleKey(e: ActivityEvent): string {
  const stage = typeof e.meta?.stage === "string" ? e.meta.stage : null;
  if (e.kind === "REPORT_REJECTED" && stage) return `REPORT_REJECTED_${stage}`;
  if (e.kind === "EXTERNAL_REPORT_REVIEWED" && stage) return `EXTERNAL_REPORT_REVIEWED_${stage}`;
  if (e.kind === "EXTERNAL_JOB_EVENT" && typeof e.meta?.eventType === "string") return `jobEvents.${e.meta.eventType}`;
  return e.kind;
}

export type Emphasis = "rejection" | "decision" | "normal";

const REJECTIONS = new Set(["REPORT_REJECTED", "WORK_ORDER_REVIEW_REJECTED", "EXTERNAL_QUOTE_REJECTED", "EXTERNAL_REPORT_REJECTED"]);

/** Decisions and rejections stand out; everything else is a plain entry. */
export function emphasisOf(e: ActivityEvent): Emphasis {
  if (REJECTIONS.has(e.kind)) return "rejection";
  return e.important ? "decision" : "normal";
}

/** Who did it: the person's name, else a safe label for why there is none (older record, station, provider, system). */
export function actorLabelKey(e: ActivityEvent): string | null {
  if (e.actor?.name) return null;
  if (e.actor) return "UNKNOWN";
  return e.actorLabel ?? "UNRECORDED";
}

/** Status transition worth showing: both ends known and different. */
export function hasTransition(e: ActivityEvent): boolean {
  return !!e.from && !!e.to && e.from !== e.to;
}

/** Tasks an event relates to (one task, or the several a work-order rejection sent back). */
export function relatedTaskIds(e: ActivityEvent): number[] {
  if (e.related?.taskIds?.length) return e.related.taskIds;
  return e.related?.taskId != null ? [e.related.taskId] : [];
}

/** Stable key for an attachment inside an event. */
export const attachmentKey = (eventId: string, attachmentId: number) => `${eventId}:${attachmentId}`;
