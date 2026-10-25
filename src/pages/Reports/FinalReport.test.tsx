import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import enReport from "@/i18n/locales/en/finalReport.json";
import arReport from "@/i18n/locales/ar/finalReport.json";
import enActivity from "@/i18n/locales/en/activity.json";
import arActivity from "@/i18n/locales/ar/activity.json";
import enCommon from "@/i18n/locales/en/common.json";
import arCommon from "@/i18n/locales/ar/common.json";
import source from "./FinalReport.tsx?raw";
import type { FinalReport } from "@/api/services/finalReportService";

vi.mock("@/i18n/config", async () => {
  const { createInstance } = await import("i18next");
  const i = createInstance();
  await i.init({ lng: "en", resources: { en: {} }, interpolation: { escapeValue: false } });
  return { default: i, isRtl: () => false };
});
vi.mock("@/api/config", () => ({ default: {} }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ hasPermission: () => true, organization: { id: 1, type: "FUEL_STATION" }, permissions: [], user: { id: 1 } }) }));

import { FinalReportView } from "./FinalReport";

const sample = (over: Partial<FinalReport> = {}): FinalReport => ({
  reference: "MR-WO-000007", kind: "INTERNAL", stage: "FINAL", status: "CLOSED", generatedAt: "2026-10-25T10:00:00.000Z", generatedBy: "mm",
  company: { name: "Co A", nameAr: null, logoUrl: null },
  request: { id: 7, number: "WO-000007", title: "Fix dispenser", description: "Replace the hose", priority: "HIGH", createdAt: "2026-10-01T07:00:00.000Z", createdBy: "mm" },
  source: null, station: { nameEn: "North", nameAr: "الشمال", address: null }, asset: { name: "Dispenser 4", type: null, model: null, serialNumber: "SN-1", location: null },
  team: [{ taskId: 1, assignee: "Sara", status: "CLOSED", acceptedAt: null, startedAt: "2026-10-02T09:00:00.000Z", completedAt: null, closedAt: null }],
  provider: null,
  work: { entries: [{ taskId: 1, assignee: "Sara", completionReport: "DONE-TEXT" }], materialsSummaries: [] },
  execution: null,
  progress: [{ id: "p1", kind: "WORK_ORDER_CREATED", category: "STATUS", at: "2026-10-01T08:00:00.000Z", actor: "mm", actorLabel: null, from: null, to: "OPEN", message: null, meta: {} }],
  approvals: [{ id: "a1", kind: "WORK_ORDER_REVIEW_REJECTED", category: "APPROVAL", at: "2026-10-03T12:00:00.000Z", actor: "mm", actorLabel: null, from: null, to: null, message: "REJECT-WHY", decision: "REJECTED", meta: {} }],
  comments: [{ id: "c1", kind: "TASK_COMMENT", category: "COMMENT", at: "2026-10-02T10:00:00.000Z", actor: null, actorLabel: "UNRECORDED", from: null, to: null, message: "COMMENT-TEXT", meta: {} }],
  photos: [{ id: "task-1", source: "TASK", phase: "BEFORE", caption: "BEFORE-CAP", at: null, by: "Sara", fileType: "IMAGE", url: "https://x.test/a.png", embeddable: true }],
  parts: { restricted: false, orders: [{ id: 3, status: "DELIVERED", createdAt: null, requestedBy: "Sara", rejectionReason: null, lines: [
    { id: 1, partName: "Hose", partCode: null, status: "DELIVERED", requested: 4, approved: 4, issued: 4, used: 4, returned: 0, usedBasis: "DEFAULT_OR_UNCONFIRMED" },
    { id: 2, partName: "Filter", partCode: null, status: "DELIVERED", requested: 3, approved: 3, issued: 3, used: 1, returned: 2, usedBasis: "RECORDED" },
  ] }] },
  completion: { completedAt: null, closedAt: "2026-10-04T09:00:00.000Z", closedBy: "ops", reviewedAt: null, reviewedBy: null, basis: "OPERATIONS_CONFIRMATION" },
  outcome: { code: "INTERNAL_CLOSED", closedAt: "2026-10-04T09:00:00.000Z" }, missing: ["photosAfter"],
  ...over,
});

async function render(report: FinalReport, lng: "en" | "ar") {
  const i = createInstance();
  await i.use(initReactI18next).init({
    lng, fallbackLng: "en", ns: ["finalReport", "activity", "common"], defaultNS: "finalReport",
    resources: { en: { finalReport: enReport, activity: enActivity, common: enCommon }, ar: { finalReport: arReport, activity: arActivity, common: arCommon } }, interpolation: { escapeValue: false },
  });
  const t = i.getFixedT(lng, "finalReport");
  const ta = i.getFixedT(lng, "activity");
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}><I18nextProvider i18n={i}><MemoryRouter>
      <div dir={lng === "ar" ? "rtl" : "ltr"}><FinalReportView report={report} lng={lng} t={t as never} ta={ta as never} /></div>
    </MemoryRouter></I18nextProvider></QueryClientProvider>,
  );
}

describe("final report view", () => {
  it("shows identity, approvals, comments, photos and parts in English", async () => {
    const html = await render(sample(), "en");
    for (const s of ["MR-WO-000007", "WO-000007", "Dispenser 4", "North", "DONE-TEXT", "REJECT-WHY", "COMMENT-TEXT", "BEFORE-CAP", "Hose", "Filter", "Final — approved and closed"]) expect(html, s).toContain(s);
    expect(html).toContain('data-stage="FINAL"');
    expect(html).toContain("Not recorded (older record)"); // an unrecorded actor is labelled, not invented
  });
  it("never labels a defaulted quantity as consumed: only an explicit figure is 'Recorded'", async () => {
    const html = await render(sample(), "en");
    expect(html).toMatch(/data-basis="DEFAULT_OR_UNCONFIRMED"[^>]*>Equals issued/);
    expect(html).toMatch(/data-basis="RECORDED"[^>]*>Recorded</);
    expect(html).not.toMatch(/consumed\./);
  });
  it("Arabic: translated labels, RTL-safe classes, no raw codes", async () => {
    const html = await render(sample(), "ar");
    for (const s of ["تقرير", "قطع الغيار", "المصروفة", "المستخدمة", "نهائي — معتمد ومغلق", "تساوي المصروف", "الشمال"]) expect(html, s).toContain(s);
    expect(html).not.toMatch(/DEFAULT_OR_UNCONFIRMED<|OPERATIONS_CONFIRMATION</);
  });
  it("lifecycle: a progress summary is clearly not final, a cancelled one says so", async () => {
    const progress = await render(sample({ stage: "PROGRESS", status: "IN_PROGRESS", outcome: { code: "INTERNAL_OPEN", closedAt: null } }), "en");
    expect(progress).toContain("Progress summary — not final");
    expect(progress).toContain("not a final report");
    const cancelled = await render(sample({ stage: "CANCELLED", outcome: { code: "CANCELLED", closedAt: null } }), "en");
    expect(cancelled).toContain("This maintenance was cancelled.");
  });
  it("missing data shows 'Not recorded' and empty sections say so; a restricted section says why", async () => {
    const html = await render(sample({ asset: null, station: null, team: [], work: { entries: [], materialsSummaries: [] }, approvals: [], comments: [], photos: [], parts: { restricted: true, orders: [] }, missing: ["asset", "station"] }), "en");
    expect(html).toContain("Not recorded");
    expect(html).toContain("Nothing has been recorded for this section.");
    expect(html).toContain("your permissions do not include this information");
    expect(html).toContain('data-testid="report-legacy-note"');
  });
  it("external: provider identity and execution detail; no commercial wording", async () => {
    const html = await render(sample({
      kind: "EXTERNAL", parts: null, team: [], provider: { name: "Provider P", nameAr: null },
      work: { entries: [{ reportId: 1, status: "APPROVED", findings: "FIND-TEXT", actionsTaken: "ACT-TEXT", submittedAt: null }], materialsSummaries: [] },
      execution: { jobs: [{ id: 1, status: "CLOSED", activatedAt: null, expectedStartDate: null, expectedEndDate: null }], visits: [{ id: 1, type: "EXECUTION", date: "2026-10-06", status: "COMPLETED", checkedInAt: null, completedAt: null, completionNote: "VISIT-NOTE" }], reports: [] },
    }), "en");
    for (const s of ["Provider P", "FIND-TEXT", "ACT-TEXT", "VISIT-NOTE", "External (service provider)"]) expect(html, s).toContain(s);
    expect(html).not.toMatch(/price|payment|quotation|invoice/i);
    expect(html).not.toContain("Spare parts");
  });
});

describe("conventions", () => {
  it("English and Arabic define the same report keys", () => {
    const keys = (o: unknown, prefix = ""): string[] => Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
    expect(keys(arReport).sort()).toEqual(keys(enReport).sort());
  });
  it("uses logical (RTL-safe) classes only and no public file links", () => {
    expect(source).not.toMatch(/\b(?:pl|pr|ml|mr)-\d|\btext-(?:left|right)\b|\b(?:left|right)-\d/);
    expect(source).not.toMatch(/\/uploads\//);
  });
});
