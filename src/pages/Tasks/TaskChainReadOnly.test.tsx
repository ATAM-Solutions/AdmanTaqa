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
let me = { id: 265, perms: ["internal_tasks.update_status", "internal_tasks.read"] };
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { id: me.id, fullName: "Manager" }, hasPermission: (p: string) => me.perms.includes(p), organization: { id: 1, type: "FUEL_STATION" }, permissions: me.perms }),
}));

import TaskDetail from "./TaskDetail";


const raw = (status: string, order: Record<string, unknown>, over: Record<string, unknown> = {}) => ({
  id: 86, internalWorkOrderId: 73, assignedUserId: 265, status, pendingStatus: null, pendingPayload: null, pendingDescription: null,
  completionReport: "تم الإصلاح", reviewedAt: "2026-11-08T13:35:50.000Z", completedAt: "2026-11-08T13:30:00.000Z",
  InternalWorkOrder: { id: 73, title: "t", status: "IN_PROGRESS", workflowVersion: 2, ...order }, ...over,
});

async function render(task: unknown, lng: "en" | "ar", who = { id: 265, perms: ["internal_tasks.update_status", "internal_tasks.read"] }) {
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

describe.each(["en", "ar"] as const)("approved completion is read-only for the technician on a review-chain order (%s)", (lng) => {
  const t = lng === "en" ? enTasks : arTasks;
  it.each(["COMPLETED", "RETURNING_MATERIALS"])("%s: no return-materials button or form, no resubmit — only the read-only explanation (findings 5-8)", async (status) => {
    const html = await render(raw(status, {}), lng);
    expect(html).toContain('data-testid="task-chain-no-submit"');
    expect(html).toContain(t.actions.completionApproved);
    for (const id of ["action-returnMaterials", "action-submitReview", "action-complete", "action-inspect", "action-parts", "form-returnMaterials"]) expect(html, id).not.toContain(`data-testid="${id}"`);
    expect(html).toContain("تم الإصلاح");           // the accepted report stays visible
  });
  it("a LEGACY (version 1) order keeps the old return-materials step", async () => {
    const html = await render(raw("COMPLETED", { workflowVersion: 1 }), lng);
    expect(html).toContain('data-testid="action-returnMaterials"');
  });
  it("work that a reviewer returned is editable again (IN_PROGRESS offers the completion form)", async () => {
    const html = await render(raw("IN_PROGRESS", {}, { reviewedAt: null }), lng);
    expect(html).toContain('data-testid="action-complete"');
    expect(html).not.toContain('data-testid="task-chain-no-submit"');
  });
});

describe.each(["en", "ar"] as const)("V1 approved completion: technician has no second submit and sees five steps (%s)", (lng) => {
  const t = lng === "en" ? enTasks : arTasks;
  const progress = { stages: [], currentStage: "completed", status: "COMPLETED", awaitingApproval: false, pendingStage: null, pendingStatus: null, reviewedAt: "2026-11-08T13:35:50.000Z", reviewedBy: null };
  it("COMPLETED + approved on a V1 order hides Submit for review but keeps the technician progress variant", async () => {
    const html = await render(raw("COMPLETED", { workflowVersion: 1 }, { progress }), lng);
    expect(html).not.toContain('data-testid="action-submitReview"');
    expect(html).toContain('data-variant="technician"');
    expect(html).not.toContain('data-stage="under_review"');
    expect(html).not.toContain('data-stage="closed"');
    expect(html).toContain(t.progress.stages.tech_completed);
  });
  it("report just submitted: read-only waiting message", async () => {
    const p = { ...progress, status: "PENDING_APPROVAL", awaitingApproval: true, pendingStatus: "COMPLETED", pendingStage: "completed", reviewedAt: null };
    const html = await render(raw("PENDING_APPROVAL", { workflowVersion: 1 }, { reviewedAt: null, pendingStatus: "COMPLETED", progress: p }), lng);
    expect(html).toContain(t.actions.completionSubmitted.replace(/'/g, "&#x27;"));
    for (const id of ["action-complete", "action-submitReview"]) expect(html).not.toContain(`data-testid="${id}"`);
  });
});
