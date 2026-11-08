import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import enTasks from "@/i18n/locales/en/tasks.json";
import arTasks from "@/i18n/locales/ar/tasks.json";
import enWh from "@/i18n/locales/en/warehouse.json";
import arWh from "@/i18n/locales/ar/warehouse.json";
import enCommon from "@/i18n/locales/en/common.json";
import arCommon from "@/i18n/locales/ar/common.json";
import { normalizeTaskDetail } from "@/api/services/taskDetailService";

vi.mock("@/i18n/config", async () => {
  const { createInstance } = await import("i18next");
  const i = createInstance();
  await i.init({ lng: "en", resources: { en: {} }, interpolation: { escapeValue: false } });
  return { default: i, isRtl: () => false };
});
vi.mock("@/api/config", () => ({ default: {} }));
let me = { id: 260, perms: ["internal_tasks.review", "internal_tasks.read"] };
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { id: me.id, fullName: "Manager" }, hasPermission: (p: string) => me.perms.includes(p), organization: { id: 1, type: "FUEL_STATION" }, permissions: me.perms }),
}));

import TaskDetail from "./TaskDetail";

const REPORT = "تم استخدام 2 جلبة وواحد كوع";
const raw = (over: Record<string, unknown> = {}) => ({
  id: 86, internalWorkOrderId: 69, assignedUserId: 265, status: "PENDING_APPROVAL", pendingStatus: "COMPLETED",
  pendingPayload: JSON.stringify({ status: "COMPLETED", message: null, completionReport: REPORT }), pendingDescription: REPORT,
  completionReport: null, InternalWorkOrder: { id: 69, title: "t", status: "IN_PROGRESS", workflowVersion: 2 }, ...over,
});

async function render(task: unknown, lng: "en" | "ar", who = { id: 260, perms: ["internal_tasks.review", "internal_tasks.read"] }) {
  me = who;
  const i = createInstance();
  await i.use(initReactI18next).init({
    lng, fallbackLng: "en", ns: ["tasks", "warehouse", "common"], defaultNS: "tasks",
    resources: { en: { tasks: enTasks, warehouse: enWh, common: enCommon }, ar: { tasks: arTasks, warehouse: arWh, common: arCommon } }, interpolation: { escapeValue: false },
  });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  qc.setQueryData(["internal-task", "86"], normalizeTaskDetail(task));
  return renderToStaticMarkup(
    <QueryClientProvider client={qc}><I18nextProvider i18n={i}><MemoryRouter initialEntries={["/internal-tasks/86"]}>
      <Routes><Route path="/internal-tasks/:id" element={<TaskDetail />} /></Routes>
    </MemoryRouter></I18nextProvider></QueryClientProvider>,
  );
}

describe("normalizeTaskDetail pending completion report", () => {
  it("reads the report (and a distinct comment) only while the completion request is pending", () => {
    expect(normalizeTaskDetail(raw())?.pendingCompletionReport).toBe(REPORT);
    const both = raw({ pendingPayload: JSON.stringify({ completionReport: REPORT, message: "ملاحظة" }) });
    expect(normalizeTaskDetail(both)?.pendingCompletionReport).toBe(`${REPORT}\n\nملاحظة`);
    expect(normalizeTaskDetail(raw({ pendingStatus: "INSPECTING" }))?.pendingCompletionReport).toBeNull();
    expect(normalizeTaskDetail(raw({ status: "COMPLETED", pendingStatus: null, pendingPayload: null, pendingDescription: null }))?.pendingCompletionReport).toBeNull();
  });
  it("falls back to the stored description when the payload is unreadable", () => {
    expect(normalizeTaskDetail(raw({ pendingPayload: "{not json" }))?.pendingCompletionReport).toBe(REPORT);
  });
});

describe.each(["en", "ar"] as const)("task completion report on the task page (%s)", (lng) => {
  it("shows the real report to the reviewer BEFORE approval", async () => {
    const html = await render(raw(), lng);
    expect(html).toContain('data-testid="pending-completion-report"');
    expect(html).toContain(REPORT);
    expect(html).toContain((lng === "en" ? enTasks : arTasks).fields.pendingCompletionReport);
  });
  it("keeps the approved report visible AFTER approval and drops the pending block", async () => {
    const html = await render(raw({ status: "COMPLETED", pendingStatus: null, pendingPayload: null, pendingDescription: null, completionReport: REPORT }), lng);
    expect(html).not.toContain('data-testid="pending-completion-report"');
    expect(html).toContain(REPORT);
  });
  it("shows no empty report block when nothing was written", async () => {
    const html = await render(raw({ pendingPayload: JSON.stringify({ status: "COMPLETED" }), pendingDescription: null }), lng);
    expect(html).not.toContain('data-testid="pending-completion-report"');
  });
});

describe.each(["en", "ar"] as const)("everything the technician wrote stays visible on the task page (%s)", (lng) => {
  it("shows the pending materials-return report BEFORE approval, then the saved return report and summaries AFTER", async () => {
    const pending = await render(raw({ pendingStatus: "RETURNING_MATERIALS", pendingPayload: JSON.stringify({ returnReportProblem: "قطعة زائدة", returnReportWorkPerformed: "أعدنا القطع" }), pendingDescription: null }), lng);
    expect(pending).toContain('data-testid="pending-return-report"');
    expect(pending).toContain("قطعة زائدة");
    expect(pending).toContain("أعدنا القطع");
    const saved = await render(raw({ status: "COMPLETED", pendingStatus: null, pendingPayload: null, pendingDescription: null, completionReport: REPORT,
      returnReportProblem: "قطعة زائدة", returnReportWorkPerformed: "أعدنا القطع", materialsUsedSummary: "٢ جلبة", materialsReturnedSummary: "١ كوع" }), lng);
    expect(saved).not.toContain('data-testid="pending-return-report"');
    for (const k of ["task-returnReportProblem", "task-returnReportWorkPerformed", "task-materialsUsedSummary", "task-materialsReturnedSummary"]) expect(saved).toContain(`data-testid="${k}"`);
    for (const txt of [REPORT, "قطعة زائدة", "أعدنا القطع", "٢ جلبة", "١ كوع"]) expect(saved).toContain(txt);
  });
  it("renders no empty block for fields nobody filled in", async () => {
    const html = await render(raw({ status: "COMPLETED", pendingStatus: null, pendingPayload: null, pendingDescription: null, completionReport: REPORT }), lng);
    for (const k of ["task-returnReportProblem", "task-materialsUsedSummary", "pending-return-report"]) expect(html).not.toContain(`data-testid="${k}"`);
  });
});
