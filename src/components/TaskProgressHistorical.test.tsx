import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import enTasks from "@/i18n/locales/en/tasks.json";
import arTasks from "@/i18n/locales/ar/tasks.json";
vi.mock("@/api/config", () => ({ default: {} }));
vi.mock("@/i18n/config", async () => { const { createInstance } = await import("i18next"); const i = createInstance(); await i.init({ lng: "en", resources: { en: {} } }); return { default: i, isRtl: () => false }; });
import TaskProgress from "./TaskProgress";
import { managementStageStates, technicianStages } from "@/lib/technicianProgress";
import type { TaskProgress as P } from "@/api/services/taskDetailService";

const st = (key: string, state: string, at: string | null = null) => ({ key, state, optional: key === "parts", at, by: null });
const base = (status: string, over: Partial<P> = {}, stages?: ReturnType<typeof st>[]): P => ({
  stages: (stages ?? [st("assigned", "done", "2026-11-12T14:36:00Z"), st("accepted", "done", "2026-11-12T14:38:00Z"), st("on_site", "done", "2026-11-12T14:38:54Z"), st("parts", "done"),
    st("completed", "done", "2026-11-12T15:03:11Z"), st("under_review", "unknown"), st("closed", "done", "2026-11-12T15:20:00Z")]) as P["stages"],
  currentStage: "closed", status, awaitingApproval: false, pendingStage: null, pendingStatus: null, reviewedAt: "2026-11-12T15:03:11Z", reviewedBy: null, ...over,
});
async function html(p: P, lng: "en" | "ar", technician = false) {
  const i = createInstance();
  await i.use(initReactI18next).init({ lng, fallbackLng: "en", ns: ["tasks"], defaultNS: "tasks", resources: { en: { tasks: enTasks }, ar: { tasks: arTasks } }, interpolation: { escapeValue: false } });
  return renderToStaticMarkup(<I18nextProvider i18n={i}><div dir={lng === "ar" ? "rtl" : "ltr"}><TaskProgress progress={p} technician={technician} /></div></I18nextProvider>);
}
const stateOf = (h: string, key: string) => new RegExp(`data-stage="${key}"[^>]*data-state="([a-z_]+)"|data-state="([a-z_]+)"[^>]*data-stage="${key}"`).exec(h)?.slice(1).find(Boolean);

describe.each(["en", "ar"] as const)("task progress, historical V1 and management view (%s)", (lng) => {
  const t = lng === "en" ? enTasks : arTasks;
  it("historical V1 CLOSED task: 'under review' is shown as covered by the completion approval — no 'unknown' question mark, no invented time/actor", async () => {
    const h = await html(base("CLOSED"), lng);
    expect(stateOf(h, "under_review")).toBe("folded");
    expect(h).toContain(t.progress.foldedIntoApproval);
    expect(h).not.toContain(t.progress.noRecord);
    const li = h.split('data-stage="under_review"')[1].split("</li>")[0];
    expect(li.slice(li.indexOf(">") + 1).replace(/<[^>]*>/g, " ")).not.toMatch(/\d/);       // no timestamp rendered for the folded stage
  });
  it("a closed task with NO approval stamp is not relabelled (stays 'no record')", async () => {
    const h = await html(base("CLOSED", { reviewedAt: null }), lng);
    expect(stateOf(h, "under_review")).toBe("unknown"); expect(h).toContain(t.progress.noRecord);
  });
  it("a real UNDER_REVIEW event on a closed task stays 'done' with its own data", async () => {
    const stages = [st("assigned", "done"), st("accepted", "done"), st("on_site", "done"), st("parts", "done"), st("completed", "done"), st("under_review", "done", "2026-11-12T15:10:00Z"), st("closed", "done")];
    expect(stateOf(await html(base("CLOSED", {}, stages), lng), "under_review")).toBe("done");
  });
  it("V1 task awaiting review keeps its pending/upcoming stages (nothing folded)", async () => {
    const stages = [st("assigned", "done"), st("accepted", "done"), st("on_site", "done"), st("parts", "upcoming"), st("completed", "done", "2026-11-12T15:03:11Z"), st("under_review", "upcoming"), st("closed", "upcoming")];
    const h = await html(base("COMPLETED", { currentStage: "completed" }, stages), lng);
    expect(stateOf(h, "under_review")).toBe("upcoming"); expect(h).not.toContain(t.progress.foldedIntoApproval);
  });
  it("V2 completed task (approved, order moving on) and V2 closed task are unchanged", async () => {
    const v2done = base("COMPLETED", { currentStage: "completed" }, [st("assigned", "done"), st("accepted", "done"), st("on_site", "done"), st("parts", "upcoming"), st("completed", "current", "2026-11-12T15:03:11Z"), st("under_review", "upcoming"), st("closed", "upcoming")]);
    expect(managementStageStates(v2done).map((x) => x.state)).toEqual(v2done.stages.map((s) => s.state));
    const v2closed = base("CLOSED", {}, [st("assigned", "done"), st("accepted", "done"), st("on_site", "done"), st("parts", "upcoming"), st("completed", "done"), st("under_review", "unknown"), st("closed", "done")]);
    // same persisted shape as V1: the rule depends on facts (closed + approval stamp), not on the version label
    expect(stateOf(await html(v2closed, lng), "under_review")).toBe("folded");
  });
  it("technician keeps the five-step view (no management stages) and is unaffected", async () => {
    const h = await html(base("CLOSED"), lng, true);
    expect(technicianStages(base("CLOSED"))).toHaveLength(5);
    expect(h).toContain('data-variant="technician"'); expect(h).not.toContain('data-stage="under_review"'); expect(h).not.toContain(t.progress.foldedIntoApproval);
  });
  it("labels exist", () => { expect(t.progress.foldedIntoApproval).toBeTruthy(); });
});
