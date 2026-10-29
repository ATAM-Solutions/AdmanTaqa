import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import enExec from "@/i18n/locales/en/execution.json";
import arExec from "@/i18n/locales/ar/execution.json";
import enFlow from "@/i18n/locales/en/flow.json";
import arFlow from "@/i18n/locales/ar/flow.json";
import enCommon from "@/i18n/locales/en/common.json";
import arCommon from "@/i18n/locales/ar/common.json";

vi.mock("@/i18n/config", async () => {
  const { createInstance } = await import("i18next");
  const i = createInstance();
  await i.init({ lng: "en", resources: { en: {} }, interpolation: { escapeValue: false } });
  return { default: i, isRtl: () => false };
});
vi.mock("@/api/config", () => ({ default: {} }));
let perms: string[] = [];
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { id: 1 }, hasPermission: (p: string) => perms.includes(p), permissions: perms, organization: { id: 1, type: "FUEL_STATION", status: "APPROVED" } }),
}));

import ProviderExecutionPanel from "./ProviderExecutionPanel";
import StationReviewPanel from "./StationReviewPanel";
import ReviewHistory from "./ReviewHistory";
import OutcomeBadges from "./OutcomeBadges";
import ReportPackage from "./ReportPackage";
import ExternalWorkReviewQueue from "@/pages/Station/ExternalWorkReviewQueue";
import NextActionBanner from "@/components/flow/NextActionBanner";
import { nextJobAction } from "@/lib/externalFlow";
import { canAccessPath } from "@/lib/accessControl";
import type { JobReview, ReviewStage } from "@/api/services/externalReviewService";

const PROVIDER_PERMS = ["provider.jobs.execute", "provider.job_orders.assign_operator", "provider.reports.create", "provider.reports.submit", "provider.job_orders.upload"];

const review = (over: Partial<JobReview> = {}, stage: ReviewStage = "NOT_SUBMITTED"): JobReview => ({
  jobOrderId: 93, status: "ACTIVE", reviewStage: stage, nextActor: "PROVIDER",
  outcome: { technicalApproved: false, financiallySettled: false, installmentsSettled: 1, installmentsTotal: 2, awaitingPayment: false },
  finalInstallment: { id: 42, sequence: 2, status: "PENDING", stage: "DUE_LATER", due: false },
  rounds: [],
  package: {
    station: { id: 172, name: "Station A", nameAr: "محطة أ" }, branch: { id: 85, name: "Branch 1", nameAr: "الفرع 1" }, provider: { id: 173, name: "Provider P", nameAr: "المزود" },
    request: { id: 153, title: "Tank inspection", description: null }, operators: [{ id: 1, name: "Field Op" }],
    visits: [{ id: 1, status: "COMPLETED", visitDate: "2026-10-29", completionNote: "Done" }], activatedAt: "2026-10-29T08:25:09.000Z", completionDate: "2026-10-30T09:00:00.000Z", timeline: [],
  },
  ...over,
});

async function render(lng: "en" | "ar", ui: React.ReactElement, seed: (qc: QueryClient) => void = () => {}) {
  const i = createInstance();
  await i.use(initReactI18next).init({
    lng, fallbackLng: "en", ns: ["execution", "flow", "common"], defaultNS: "common",
    resources: { en: { execution: enExec, flow: enFlow, common: enCommon }, ar: { execution: arExec, flow: arFlow, common: arCommon } },
    interpolation: { escapeValue: false },
  });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  seed(qc);
  return renderToStaticMarkup(
    <QueryClientProvider client={qc}><I18nextProvider i18n={i}><MemoryRouter>{ui}</MemoryRouter></I18nextProvider></QueryClientProvider>,
  );
}
const visit = (status: string) => ({ id: 7, status, type: "EXECUTION", visitDate: "2026-10-29" });
const panel = (lng: "en" | "ar", opts: { status?: string; operators?: boolean; visits?: ReturnType<typeof visit>[]; reports?: Array<Record<string, unknown>>; review?: JobReview } = {}) => {
  const { status = "ACTIVE", operators = true, visits = [], reports = [], review: rv } = opts;
  return render(lng,
    <ProviderExecutionPanel jobOrderId={93} status={status} review={rv} assignedOperators={operators ? [{ id: 1, name: "Field Op" }] : []} />,
    (qc) => { qc.setQueryData(["provider-job-order-visits", "93"], visits); qc.setQueryData(["provider-job-order-reports", "93"], reports); qc.setQueryData(["operators"], [{ id: 5, name: "Op Five" }]); });
};

describe("Provider execution workspace", () => {
  it("asks for an operator first, and offers nothing later until there is one", async () => {
    perms = PROVIDER_PERMS;
    const html = await panel("en", { operators: false });
    expect(html).toContain('data-testid="assign-operator"');
    expect(html).toContain("Op Five");
    expect(html).not.toContain('data-testid="start-work"');
    expect(html).toContain("Assign an operator first.");
    expect(html).not.toContain('data-testid="submit-report"');
  });
  it("offers Start work once an operator is assigned and no visit exists", async () => {
    perms = PROVIDER_PERMS;
    const html = await panel("en", { visits: [] });
    expect(html).toContain('data-testid="start-work"');
    expect(html).not.toContain('data-testid="assign-operator"');
  });
  it("offers check-in on a created visit, and evidence + finish only on a checked-in visit", async () => {
    perms = PROVIDER_PERMS;
    const created = await panel("en", { visits: [visit("DRAFT")] });
    expect(created).toContain('data-testid="checkin-gps"');
    expect(created).not.toContain('data-testid="complete-visit"');
    expect(created).not.toContain('data-testid="visit-photo-input"');
    const inVisit = await panel("en", { status: "IN_PROGRESS", visits: [visit("CHECKED_IN")] });
    expect(inVisit).toContain('data-testid="visit-photo-input"');
    expect(inVisit).toContain('data-testid="complete-visit"');
    expect(inVisit).not.toContain('data-testid="final-report-form"');
  });
  it("manual check-in is offered only with the manual check-in permission", async () => {
    perms = PROVIDER_PERMS;
    expect(await panel("en", { visits: [visit("DRAFT")] })).not.toContain("Check in manually");
    perms = [...PROVIDER_PERMS, "provider.jobs.manual_checkin"];
    expect(await panel("en", { visits: [visit("DRAFT")] })).toContain("Check in manually");
  });
  it("shows the final report form with a submit button once a visit is completed", async () => {
    perms = PROVIDER_PERMS;
    const html = await panel("en", { status: "IN_PROGRESS", visits: [visit("COMPLETED")] });
    expect(html).toContain('data-testid="final-report-form"');
    expect(html).toContain('data-testid="submit-report"');
    expect(html).toContain("Findings");
    expect(html).toContain("Save the draft to attach completion photos.");
  });
  it("a returned job shows the manager's comment and a form prefilled with the returned report", async () => {
    perms = PROVIDER_PERMS;
    const html = await panel("en", { status: "REWORK_REQUIRED", visits: [visit("COMPLETED")], reports: [{ id: 3, status: "REJECTED", findings: "old findings", actionsTaken: "old actions", rejectionReason: "Photos do not show the seal" }] });
    expect(html).toContain('data-testid="returned-notice"');
    expect(html).toContain("Photos do not show the seal");
    expect(html).toContain("old findings");
  });
  it("is read-only while under review and says who reviews", async () => {
    perms = PROVIDER_PERMS;
    const html = await panel("en", { status: "UNDER_REVIEW", visits: [visit("COMPLETED")], review: review({}, "AWAITING_OPERATIONS_MANAGER") });
    expect(html).toContain('data-testid="under-review-note"');
    expect(html).toContain("Operations Manager");
    expect(html).not.toContain('data-testid="submit-report"');
    expect(html).not.toContain('data-testid="start-work"');
  });
  it("a role without execute permission sees no action buttons", async () => {
    perms = ["provider.job_orders.read"];
    const html = await panel("en", { visits: [visit("DRAFT")] });
    expect(html).not.toContain("<button");
    expect(html).toContain("can view this job but not run the work");
  });
  it("renders in Arabic", async () => {
    perms = PROVIDER_PERMS;
    const html = await panel("ar", { status: "IN_PROGRESS", visits: [visit("COMPLETED")] });
    expect(html).toContain("تقرير الصيانة النهائي");
    expect(html).toContain("إرسال للمراجعة");
    expect(html).not.toMatch(/Final maintenance report/);
  });
});

describe("Station technical review", () => {
  const station = (lng: "en" | "ar", stage: ReviewStage, reportId: number | null = 5) =>
    render(lng, <StationReviewPanel jobOrderId={93} review={review({ status: "UNDER_REVIEW" }, stage)} reportId={reportId} />);
  it("Maintenance Manager decides the first stage: approve & forward, or return with a comment", async () => {
    perms = ["external_maintenance_v2.maintenance_review"];
    const html = await station("en", "AWAITING_MAINTENANCE_MANAGER");
    expect(html).toContain('data-testid="approve-review"');
    expect(html).toContain("Approve and forward");
    expect(html).toContain('data-testid="return-review"');
    expect(html).toContain("does not make any payment due");
    expect(html).not.toContain("Final approval");
  });
  it("the Operations Manager cannot act on the Maintenance stage (and vice versa)", async () => {
    perms = ["external_maintenance_v2.ops_closure"];
    const early = await station("en", "AWAITING_MAINTENANCE_MANAGER");
    expect(early).not.toContain('data-testid="approve-review"');
    expect(early).toContain('data-testid="not-your-stage"');
    const own = await station("en", "AWAITING_OPERATIONS_MANAGER");
    expect(own).toContain("Final approval");
    expect(own).toContain("makes the last installment due");
    perms = ["external_maintenance_v2.maintenance_review"];
    expect(await station("en", "AWAITING_OPERATIONS_MANAGER")).not.toContain('data-testid="approve-review"');
  });
  it("offers no review actions when the work is returned, approved, legacy or has no report", async () => {
    perms = ["external_maintenance_v2.maintenance_review", "external_maintenance_v2.ops_closure"];
    for (const stage of ["RETURNED_TO_PROVIDER", "APPROVED", "NOT_SUBMITTED"] as ReviewStage[]) expect(await station("en", stage)).not.toContain('data-testid="approve-review"');
    expect(await station("en", "AWAITING_MAINTENANCE_MANAGER", null)).not.toContain('data-testid="approve-review"');
  });
  it("shows technical and financial outcomes separately", async () => {
    perms = [];
    const approvedUnpaid = await render("en", <OutcomeBadges review={review({ status: "CLOSED", outcome: { technicalApproved: true, financiallySettled: false, installmentsSettled: 1, installmentsTotal: 2, awaitingPayment: true } }, "APPROVED")} />);
    expect(approvedUnpaid).toContain('data-state="approved"');
    expect(approvedUnpaid).toContain("1 of 2 installments confirmed");
    expect(approvedUnpaid).not.toContain("Financially settled");
    const settled = await render("en", <OutcomeBadges review={review({ outcome: { technicalApproved: true, financiallySettled: true, installmentsSettled: 2, installmentsTotal: 2, awaitingPayment: false } }, "APPROVED")} />);
    expect(settled).toContain("Financially settled");
    const ar = await render("ar", <OutcomeBadges review={review({ outcome: { technicalApproved: true, financiallySettled: true, installmentsSettled: 2, installmentsTotal: 2, awaitingPayment: false } }, "APPROVED")} />);
    expect(ar).toContain("مسوّى مالياً");
  });
  it("review history keeps every round with who, when and why", async () => {
    const rounds = [
      { round: 1, reportId: 1, status: "REJECTED", submittedAt: "2026-10-30T09:00:00.000Z", submittedBy: { id: 9, name: "Provider User" }, twoStep: true,
        maintenanceManager: { decision: "RETURNED" as const, by: { id: 2, name: "Mona MM" }, at: "2026-10-30T10:00:00.000Z", comment: "Photos do not show the seal" }, operationsManager: null },
      { round: 2, reportId: 2, status: "APPROVED", submittedAt: "2026-10-31T09:00:00.000Z", submittedBy: { id: 9, name: "Provider User" }, twoStep: true,
        maintenanceManager: { decision: "APPROVED" as const, by: { id: 2, name: "Mona MM" }, at: "2026-10-31T10:00:00.000Z", comment: null }, operationsManager: { decision: "APPROVED" as const, by: { id: 3, name: "Omar OM" }, at: "2026-10-31T11:00:00.000Z", comment: "OK" } },
    ];
    const html = await render("en", <ReviewHistory review={{ rounds }} />);
    expect(html).toContain("Submission 1");
    expect(html).toContain("Submission 2");
    expect(html).toContain("Photos do not show the seal");
    expect(html).toContain("Mona MM");
    expect(html).toContain("Omar OM");
    const ar = await render("ar", <ReviewHistory review={{ rounds }} />);
    expect(ar).toContain("مدير الصيانة");
    expect(ar).toContain("Photos do not show the seal");
  });
  it("the report package shows job, provider, operator, findings, photos and completion date", async () => {
    const html = await render("en", <ReportPackage review={review()} report={{ id: 5, status: "SUBMITTED", findings: "Corroded seal", actionsTaken: "Replaced seal", attachments: [{ fileUrl: "/uploads/a.png", category: "completion" }] } as never} />);
    for (const s of ["Station A", "Provider P", "Field Op", "Corroded seal", "Replaced seal", "/uploads/a.png"]) expect(html).toContain(s);
    expect(await render("ar", <ReportPackage review={review()} report={undefined} />)).toContain("محطة أ");
  });
});

describe("Review queues", () => {
  const item = { reportId: 5, jobOrderId: 93, externalRequestId: 153, title: "Tank inspection", branch: { id: 85, name: "Branch 1", nameAr: "الفرع 1" }, provider: { id: 173, name: "Provider P" }, submittedAt: "2026-10-30T09:00:00.000Z", maintenanceApprovedAt: "2026-10-30T10:00:00.000Z", stage: "MAINTENANCE_MANAGER" as const };
  it("lists waiting work with a link to the job order, per stage", async () => {
    const m = await render("en", <ExternalWorkReviewQueue stage="maintenance" />, (qc) => qc.setQueryData(["review-queue", "maintenance"], { items: [item], total: 1 }));
    expect(m).toContain("Maintenance Manager review");
    expect(m).toContain('href="/station-job-orders/93"');
    expect(m).not.toContain("Maintenance approved");
    const o = await render("en", <ExternalWorkReviewQueue stage="operations" />, (qc) => qc.setQueryData(["review-queue", "operations"], { items: [{ ...item, stage: "OPERATIONS_MANAGER" }], total: 1 }));
    expect(o).toContain("Operations Manager approval");
    expect(o).toContain("Maintenance approved");
  });
  it("has an empty state and renders in Arabic", async () => {
    const e = await render("ar", <ExternalWorkReviewQueue stage="operations" />, (qc) => qc.setQueryData(["review-queue", "operations"], { items: [], total: 0 }));
    expect(e).toContain("لا شيء بانتظار مراجعتك");
  });
  it("each queue is gated by its own permission", () => {
    expect(canAccessPath("/external-reviews/maintenance", "FUEL_STATION", ["external_maintenance_v2.maintenance_review"])).toBe(true);
    expect(canAccessPath("/external-reviews/operations", "FUEL_STATION", ["external_maintenance_v2.maintenance_review"])).toBe(false);
    expect(canAccessPath("/external-reviews/maintenance", "SERVICE_PROVIDER", ["external_maintenance_v2.maintenance_review"])).toBe(false);
    expect(canAccessPath("/external-reviews/operations", "FUEL_STATION", ["external_maintenance_v2.ops_closure"])).toBe(true);
  });
});

describe("Next action by role", () => {
  const key = (i: Parameters<typeof nextJobAction>[0]) => nextJobAction(i).key;
  it("provider: assign → start → work → submit report → wait for each reviewer → payment/technical-done", () => {
    const base = { side: "provider" as const, status: "ACTIVE", milestones: [] };
    expect(key({ ...base, operatorCount: 0 })).toBe("provider.assignOperator");
    expect(key({ ...base, operatorCount: 1, hasVisit: false })).toBe("provider.startWork");
    expect(key({ ...base, status: "IN_PROGRESS", operatorCount: 1, hasVisit: true })).toBe("provider.work");
    expect(key({ ...base, status: "IN_PROGRESS", operatorCount: 1, hasVisit: true, hasCompletedVisit: true })).toBe("provider.submitReport");
    expect(key({ ...base, status: "UNDER_REVIEW", reviewStage: "AWAITING_MAINTENANCE_MANAGER" })).toBe("provider.waitMaintenance");
    expect(key({ ...base, status: "UNDER_REVIEW", reviewStage: "AWAITING_OPERATIONS_MANAGER" })).toBe("provider.waitOperations");
    expect(key({ ...base, status: "REWORK_REQUIRED" })).toBe("provider.rework");
    expect(key({ ...base, status: "CLOSED", financiallySettled: false })).toBe("none.technicalDone");
    expect(key({ ...base, status: "CLOSED", financiallySettled: true })).toBe("none.done");
  });
  it("station: the viewer is told to act only on the stage they may decide", () => {
    const s = { side: "station" as const, status: "UNDER_REVIEW" };
    expect(nextJobAction({ ...s, reviewStage: "AWAITING_MAINTENANCE_MANAGER", canReviewMaintenance: true })).toEqual({ key: "station.reviewMaintenance", actor: "you" });
    expect(nextJobAction({ ...s, reviewStage: "AWAITING_MAINTENANCE_MANAGER", canReviewOperations: true })).toEqual({ key: "station.waitMaintenance", actor: "other" });
    expect(nextJobAction({ ...s, reviewStage: "AWAITING_OPERATIONS_MANAGER", canReviewOperations: true })).toEqual({ key: "station.reviewOperations", actor: "you" });
    expect(nextJobAction({ ...s, reviewStage: "AWAITING_OPERATIONS_MANAGER", canReviewMaintenance: true })).toEqual({ key: "station.waitOperations", actor: "other" });
    expect(key({ ...s, reviewStage: "LEGACY_SINGLE_STEP" })).toBe("station.review");
  });
  it("every next-action key has an English and an Arabic sentence", async () => {
    const keys = ["provider.startWork", "provider.submitReport", "provider.waitMaintenance", "provider.waitOperations", "station.reviewMaintenance", "station.reviewOperations", "station.waitMaintenance", "station.waitOperations", "none.technicalDone"];
    for (const lng of ["en", "ar"] as const) for (const k of keys) {
      const html = await render(lng, <NextActionBanner action={{ key: k as never, actor: "you" }} />);
      expect(html, `${lng} ${k}`).not.toContain(`next.${k}`);
    }
  });
});
