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
import enPay from "@/i18n/locales/en/payments.json";
import arPay from "@/i18n/locales/ar/payments.json";
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
import ProviderManagerReviewPanel from "./ProviderManagerReviewPanel";
import ProviderReviewQueue from "@/pages/Provider/ProviderReviewQueue";
import PaymentMilestonesCard from "@/components/PaymentMilestonesCard";
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
    lng, fallbackLng: "en", ns: ["execution", "flow", "payments", "common"], defaultNS: "common",
    resources: { en: { execution: enExec, flow: enFlow, payments: enPay, common: enCommon }, ar: { execution: arExec, flow: arFlow, payments: arPay, common: arCommon } },
    interpolation: { escapeValue: false },
  });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  seed(qc);
  return renderToStaticMarkup(
    <QueryClientProvider client={qc}><I18nextProvider i18n={i}><MemoryRouter>{ui}</MemoryRouter></I18nextProvider></QueryClientProvider>,
  );
}
const visit = (status: string) => ({ id: 7, status, type: "EXECUTION", visitDate: "2026-10-29" });
const panel = (lng: "en" | "ar", opts: { status?: string; operators?: boolean; visits?: ReturnType<typeof visit>[]; reports?: Array<Record<string, unknown>>; review?: JobReview; mine?: boolean } = {}) => {
  const { status = "ACTIVE", operators = true, visits = [], reports = [], review: rv, mine = true } = opts;
  return render(lng,
    <ProviderExecutionPanel jobOrderId={93} status={status} review={rv} assignedOperators={operators ? [{ id: 1, name: "Field Op" }] : []} viewerIsAssigned={mine} />,
    (qc) => { qc.setQueryData(["provider-job-order-visits", "93"], visits); qc.setQueryData(["provider-job-order-reports", "93"], reports); qc.setQueryData(["operators"], [{ id: 5, name: "Op Five" }]); });
};

describe("Provider execution workspace", () => {
  it("production Operator role copy (visit-level keys only): can start and check in, is told up front what it cannot do, and is never offered notes / complete / report buttons the server refuses", async () => {
    // exactly the six keys of Operator role copy #252 (the operator of production job #93): no provider.jobs.execute, no reports.*
    perms = ["provider.job_orders.read", "provider.job_orders.update_status", "provider.job_orders.upload", "provider.visits.checkin", "provider.visits.upload"];
    const start = await panel("en", { visits: [] });
    expect(start).toContain('data-testid="start-work"');
    const tag = (html: string, id: string) => html.match(new RegExp(`<button[^>]*data-testid="${id}"[^>]*>`))?.[0] ?? "";
    expect(tag(start, "start-work")).not.toMatch(/\sdisabled(=|\s|>)/);
    expect(start).toContain('data-testid="missing-permissions"');
    for (const k of ["notes", "report", "submit"]) expect(start).toContain(`data-testid="missing-${k}"`);
    expect(start).not.toContain('data-testid="missing-start"');
    const working = await panel("en", { status: "IN_PROGRESS", visits: [visit("CHECKED_IN")] });
    expect(tag(working, "complete-visit")).toMatch(/\sdisabled(=|\s|>)/);
    const ar = await panel("ar", { visits: [] });
    expect(ar).toContain("دورك لا يتيح جزءًا من هذا العمل");
    expect(ar).not.toContain("missingPermissions.");
    // a full Operator role sees no such notice
    perms = PROVIDER_PERMS;
    expect(await panel("en", { visits: [] })).not.toContain('data-testid="missing-permissions"');
  });
  it("Bug #5: local Operator copy #252 (its six keys incl. rfqs.read) is warned; after the two approved grants (execute + reports.submit) the warning is gone and the visit controls open", async () => {
    const tag = (html: string, id: string) => html.match(new RegExp(`<button[^>]*data-testid="${id}"[^>]*>`))?.[0] ?? "";
    const before = ["provider.job_orders.read", "provider.job_orders.update_status", "provider.job_orders.upload", "provider.rfqs.read", "provider.visits.checkin", "provider.visits.upload"];
    perms = before;
    const warned = await panel("en", { visits: [] });
    expect(warned).toContain('data-testid="missing-permissions"');
    for (const k of ["notes", "report", "submit"]) expect(warned).toContain(`data-testid="missing-${k}"`);
    perms = [...before, "provider.jobs.execute", "provider.reports.submit"];
    for (const lng of ["en", "ar"] as const) {
      const ok = await panel(lng, { visits: [] });
      expect(ok).not.toContain('data-testid="missing-permissions"');
      expect(tag(ok, "start-work")).not.toMatch(/\sdisabled(=|\s|>)/);
    }
    const working = await panel("en", { status: "IN_PROGRESS", visits: [visit("CHECKED_IN")] });
    expect(tag(working, "complete-visit")).not.toMatch(/\sdisabled(=|\s|>)/);
    // the grants do not open manager controls
    expect(working).not.toContain('data-testid="operator-picker"');
  });
  describe("Bug #7: manager-confirmed manual check-in", () => {
    const MANAGER = ["provider.job_orders.read", "provider.job_orders.assign_operator", "provider.jobs.execute", "provider.visits.checkin", "provider.jobs.manual_checkin"];
    const open = [visit("DRAFT")];
    for (const lng of ["en", "ar"] as const) {
      const L = (lng === "en" ? enExec : arExec) as unknown as { manual: { button: string; needsVisit: string; sectionHint: string } };
      it(`(${lng}) a Provider Manager who is not the assigned operator sees a separate Manual Check-in action, not the operator's GPS controls`, async () => {
        perms = MANAGER;
        const html = await panel(lng, { visits: open, mine: false });
        expect(html).toContain('data-testid="manual-checkin-section"');
        expect(html).toContain('data-testid="manual-checkin-open"');
        expect(html).toContain(L.manual.button);
        expect(html).toContain(L.manual.sectionHint);
        expect(html).not.toContain('data-testid="checkin-gps"'); // GPS stays the operator's own
        expect(html).not.toContain('data-testid="start-work"');
        expect(html).not.toMatch(/manual\.[a-z]/i); // no raw translation key
      });
      it(`(${lng}) with no open visit the manager is told the operator must start the work first`, async () => {
        perms = MANAGER;
        const html = await panel(lng, { visits: [], mine: false });
        expect(html).toContain('data-testid="manual-needs-visit"');
        expect(html).toContain(L.manual.needsVisit);
        expect(html).not.toContain('data-testid="manual-checkin-open"');
      });
    }
    it("is not offered without the explicit permission, to the assigned operator (who keeps their own controls), once checked in, on a non-executable job, or with no operator", async () => {
      perms = MANAGER.filter((p) => p !== "provider.jobs.manual_checkin");
      expect(await panel("en", { visits: open, mine: false })).not.toContain('data-testid="manual-checkin-open"');
      perms = MANAGER.filter((p) => p !== "provider.job_orders.assign_operator");
      expect(await panel("en", { visits: open, mine: false })).not.toContain('data-testid="manual-checkin-open"');
      perms = MANAGER;
      expect(await panel("en", { visits: open, mine: true })).not.toContain('data-testid="manual-checkin-open"');
      expect(await panel("en", { visits: [visit("CHECKED_IN")], mine: false })).not.toContain('data-testid="manual-checkin-open"');
      expect(await panel("en", { status: "UNDER_REVIEW", visits: open, mine: false })).not.toContain('data-testid="manual-checkin-open"');
      expect(await panel("en", { operators: false, visits: open, mine: false })).not.toContain('data-testid="manual-checkin-open"');
    });
    it("an Operator (manual_checkin but no assign_operator) never gets the manager action on someone else's job", async () => {
      perms = ["provider.job_orders.read", "provider.jobs.execute", "provider.visits.checkin", "provider.jobs.manual_checkin"];
      const html = await panel("en", { visits: open, mine: false });
      expect(html).not.toContain('data-testid="manual-checkin-open"');
      expect(html).toContain('data-testid="not-your-job"');
    });
  });
  it("a technician (execute, no assign_operator) never gets the operator picker or the operators request", async () => {
    perms = ["provider.jobs.execute", "provider.reports.create", "provider.reports.submit"];
    const html = await panel("en", { operators: false, mine: false });
    expect(html).not.toContain('data-testid="operator-select"');
    expect(html).not.toContain('data-testid="assign-operator"');
    expect(html).not.toContain('data-testid="start-work"');
  });
  it("a technician who is not the assigned operator sees no work controls; a manager can still assign", async () => {
    perms = ["provider.jobs.execute", "provider.reports.create", "provider.reports.submit"];
    const other = await panel("en", { operators: true, mine: false });
    expect(other).toContain('data-testid="not-your-job"');
    expect(other).not.toContain('data-testid="start-work"');
    perms = ["provider.job_orders.assign_operator"];
    const mgr = await panel("en", { operators: false, mine: false });
    expect(mgr).toContain('data-testid="assign-operator"');
    expect(mgr).not.toContain('data-testid="start-work"');
  });
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
    const keys = ["provider.managerApprove", "provider.waitProviderManager", "provider.waitFinalClosure", "provider.requestFinalInstallment", "provider.waitRequest", "station.closeWorkOrder", "station.waitFinalClosure", "station.waitProviderManager", "station.waitProviderRequest", "provider.startWork", "provider.submitReport", "provider.waitMaintenance", "provider.waitOperations", "station.reviewMaintenance", "station.reviewOperations", "station.waitMaintenance", "station.waitOperations", "none.technicalDone"];
    for (const lng of ["en", "ar"] as const) for (const k of keys) {
      const html = await render(lng, <NextActionBanner action={{ key: k as never, actor: "you" }} />);
      expect(html, `${lng} ${k}`).not.toContain(`next.${k}`);
    }
  });
});

// ───────────── review chain (report.workflowVersion 2) ─────────────
const MGR = "provider_job_v2.review_report";
const round = (over: Record<string, unknown> = {}) => ({
  round: 1, reportId: 11, status: "SUBMITTED", submittedAt: "2026-11-01T09:00:00.000Z", submittedBy: { id: 9, name: "Tech Tom" }, twoStep: true, workflowVersion: 2 as const,
  providerManager: null, maintenanceManager: null, operationsManager: null, technicalClosure: null, ...over,
});
const chain = (stage: ReviewStage, rounds = [round()], over: Partial<JobReview> = {}) => review({ status: "UNDER_REVIEW", workflowVersion: 2, rounds, ...over }, stage);

describe("Provider Manager review (chain step 3)", () => {
  const mgr = (lng: "en" | "ar", rv: JobReview | undefined, ownReport?: boolean) => render(lng, <ProviderManagerReviewPanel jobOrderId={93} review={rv} ownReport={ownReport} />);
  it("holder of review_report can approve; return is disabled until a comment is typed", async () => {
    perms = [MGR];
    for (const lng of ["en", "ar"] as const) {
      const html = await mgr(lng, chain("AWAITING_PROVIDER_MANAGER"));
      expect(html).toContain('data-testid="manager-approve"');
      expect(html).toMatch(/data-testid="manager-return"/);
      const ret = html.match(/<button[^>]*data-testid="manager-return"[^>]*>/)?.[0] ?? "";
      expect(ret).toMatch(/ disabled=""/);
      const appr = html.match(/<button[^>]*data-testid="manager-approve"[^>]*>/)?.[0] ?? "";
      expect(appr).not.toMatch(/ disabled=""/);
      expect(html).toContain('data-testid="report-package"');
    }
    expect(await mgr("en", chain("AWAITING_PROVIDER_MANAGER"))).toContain("Approve and send to the station");
    expect(await mgr("ar", chain("AWAITING_PROVIDER_MANAGER"))).toContain("اعتماد وإرسال إلى المحطة");
  });
  it("the author of the report cannot review it: both actions disabled with an explanation", async () => {
    perms = [MGR];
    const html = await mgr("en", chain("AWAITING_PROVIDER_MANAGER", [round({ submittedBy: { id: 1, name: "Me" } })]));
    expect(html).toContain('data-testid="own-report-note"');
    for (const id of ["manager-approve", "manager-return"]) expect(html.match(new RegExp(`<button[^>]*data-testid="${id}"[^>]*>`))?.[0]).toMatch(/ disabled=""/);
    expect(await mgr("en", chain("AWAITING_PROVIDER_MANAGER"), true)).toContain('data-testid="own-report-note"');
  });
  it("is absent without the permission, at other stages, and for legacy reports", async () => {
    perms = ["provider.jobs.execute", "provider.reports.submit"];
    expect(await mgr("en", chain("AWAITING_PROVIDER_MANAGER"))).not.toContain("provider-manager-review");
    perms = [MGR];
    expect(await mgr("en", chain("AWAITING_MAINTENANCE_MANAGER"))).not.toContain("provider-manager-review");
    expect(await mgr("en", review({ status: "UNDER_REVIEW", workflowVersion: 1 }, "AWAITING_MAINTENANCE_MANAGER"))).not.toContain("provider-manager-review");
    expect(await mgr("en", review({ status: "UNDER_REVIEW", workflowVersion: null }, "AWAITING_PROVIDER_MANAGER"))).not.toContain("provider-manager-review");
    expect(await mgr("en", undefined)).toBe("");
  });
});

describe("Provider execution panel in the chain", () => {
  it("says which step the submitted report is waiting on", async () => {
    perms = PROVIDER_PERMS;
    const cases: Array<[ReviewStage, string, string]> = [
      ["AWAITING_PROVIDER_MANAGER", "Provider Manager", "مدير المزوّد"],
      ["AWAITING_FINAL_CLOSURE", "close the work order technically", "إغلاق أمر العمل فنياً"],
    ];
    for (const [stage, en, ar] of cases) {
      expect(await panel("en", { status: "UNDER_REVIEW", visits: [visit("COMPLETED")], review: chain(stage) })).toContain(en);
      expect(await panel("ar", { status: "UNDER_REVIEW", visits: [visit("COMPLETED")], review: chain(stage) })).toContain(ar);
    }
  });
  it("a returned report names who returned it and why", async () => {
    perms = PROVIDER_PERMS;
    const cases: Array<[string, Record<string, unknown>]> = [
      ["providerManager", { providerManager: { decision: "RETURNED", by: { id: 4, name: "Pat PM" }, at: "2026-11-01T10:00:00.000Z", comment: "Add after photo" } }],
      ["maintenance", { providerManager: { decision: "APPROVED", by: { id: 4, name: "Pat PM" }, at: null, comment: null }, maintenanceManager: { decision: "RETURNED", by: { id: 2, name: "Mona MM" }, at: null, comment: "Add after photo" } }],
      ["operations", { providerManager: { decision: "APPROVED", by: { id: 4, name: "Pat PM" }, at: null, comment: null }, maintenanceManager: { decision: "APPROVED", by: { id: 2, name: "Mona MM" }, at: null, comment: null }, operationsManager: { decision: "RETURNED", by: { id: 3, name: "Omar OM" }, at: null, comment: "Add after photo" } }],
    ];
    for (const [role, decisions] of cases) {
      const rv = chain("RETURNED_TO_PROVIDER", [round({ reportId: 3, status: "REJECTED", ...decisions })]);
      const html = await panel("en", { status: "REWORK_REQUIRED", visits: [visit("COMPLETED")], review: rv, reports: [{ id: 3, status: "REJECTED", findings: "f", actionsTaken: "a", rejectionReason: "Add after photo" }] });
      expect(html).toContain(`data-role="${role}"`);
      expect(html).toContain("Add after photo");
      expect(html).toContain("Returned by");
      expect(await panel("ar", { status: "REWORK_REQUIRED", visits: [visit("COMPLETED")], review: rv, reports: [{ id: 3, status: "REJECTED", findings: "f", actionsTaken: "a" }] })).toContain("أعاده");
    }
  });
});

describe("Station technical closure (chain step 6)", () => {
  const station = (lng: "en" | "ar", stage: ReviewStage, rv: JobReview = chain(stage)) => render(lng, <StationReviewPanel jobOrderId={93} review={rv} reportId={11} />);
  it("only the Maintenance Manager gets the closure action, only at AWAITING_FINAL_CLOSURE", async () => {
    perms = ["external_maintenance_v2.maintenance_review"];
    const html = await station("en", "AWAITING_FINAL_CLOSURE");
    expect(html).toContain('data-testid="technical-closure-button"');
    expect(html).toContain("Close work order (technical closure)");
    expect(await station("ar", "AWAITING_FINAL_CLOSURE")).toContain("إغلاق أمر العمل");
    for (const stage of ["AWAITING_OPERATIONS_MANAGER", "AWAITING_MAINTENANCE_MANAGER", "APPROVED", "AWAITING_PROVIDER_MANAGER"] as ReviewStage[])
      expect(await station("en", stage)).not.toContain("technical-closure-button");
    perms = ["external_maintenance_v2.ops_closure"];
    const ops = await station("en", "AWAITING_FINAL_CLOSURE");
    expect(ops).not.toContain("technical-closure-button");
    expect(ops).toContain('data-testid="closure-not-yours"');
  });
  it("legacy jobs never show the closure step", async () => {
    perms = ["external_maintenance_v2.maintenance_review"];
    const legacy = review({ status: "UNDER_REVIEW", workflowVersion: 1 }, "AWAITING_FINAL_CLOSURE");
    expect(await station("en", "AWAITING_FINAL_CLOSURE", legacy)).not.toContain("technical-closure-button");
  });
  it("Operations approval in chain mode is explained as not closing the job; legacy copy is unchanged", async () => {
    perms = ["external_maintenance_v2.ops_closure"];
    expect(await station("en", "AWAITING_OPERATIONS_MANAGER")).toContain("does not close the work order");
    const legacy = await station("en", "AWAITING_OPERATIONS_MANAGER", review({ status: "UNDER_REVIEW", workflowVersion: 1 }, "AWAITING_OPERATIONS_MANAGER"));
    expect(legacy).toContain("makes the last installment due");
    expect(legacy).not.toContain("does not close");
  });
  it("review history shows the provider manager and closure steps for chain rounds only", async () => {
    const dec = (n: string) => ({ decision: "APPROVED" as const, by: { id: 1, name: n }, at: "2026-11-01T10:00:00.000Z", comment: null });
    const r2 = round({ providerManager: dec("Pat PM"), maintenanceManager: dec("Mona MM"), operationsManager: dec("Omar OM"), technicalClosure: { by: { id: 2, name: "Mona MM" }, at: "2026-11-01T12:00:00.000Z", comment: "Closed" } });
    const html = await render("en", <ReviewHistory review={{ rounds: [r2] as never }} />);
    expect(html).toContain("Provider Manager");
    expect(html).toContain('data-testid="review-closure"');
    const legacy = await render("en", <ReviewHistory review={{ rounds: [{ ...r2, workflowVersion: 1 }] as never }} />);
    expect(legacy).not.toContain("Provider Manager");
    expect(legacy).not.toContain('data-testid="review-closure"');
    expect(await render("ar", <ReviewHistory review={{ rounds: [r2] as never }} />)).toContain("مدير المزوّد");
  });
});

describe("Final installment request (chain step 7)", () => {
  const wf = (stage: string, request: { allowed: boolean; reason: string | null }, report: { allowed: boolean; reason: string | null }) =>
    ({ stage, due: true, report: { actor: "STATION", ...report }, confirmReceipt: { actor: "PROVIDER", allowed: false, reason: "PAYMENT_NOT_SENT_YET" }, request: { actor: "PROVIDER_MANAGER", ...request } });
  const ms = (workflow: ReturnType<typeof wf>) => [{ id: 42, sequence: 2, percent: "50", trigger: "ON_JOB_CLOSED", amount: "500.000", currency: "OMR", status: "PENDING", receiptUrl: null, referenceNumber: null, workflow }];
  const card = (lng: "en" | "ar", side: "station" | "provider", data: ReturnType<typeof ms>) =>
    render(lng, <PaymentMilestonesCard side={side} jobOrderId={93} />, (qc) => qc.setQueryData(["payment-milestones", side, "93"], data));
  const awaiting = ms(wf("AWAITING_PROVIDER_REQUEST", { allowed: true, reason: null }, { allowed: false, reason: "MILESTONE_NOT_REQUESTED" }));

  it("the Provider Manager gets the request button in AWAITING_PROVIDER_REQUEST", async () => {
    perms = [MGR];
    const html = await card("en", "provider", awaiting);
    expect(html).toContain('data-testid="request-installment"');
    expect(html).toContain("Request final installment");
    expect(html).toContain("Awaiting provider request");
    expect(await card("ar", "provider", awaiting)).toContain("طلب الدفعة الأخيرة");
  });
  it("others (no permission, not allowed, other stages) get no request button", async () => {
    perms = ["provider.payments.confirm_received"];
    expect(await card("en", "provider", awaiting)).not.toContain("request-installment");
    perms = [MGR];
    expect(await card("en", "provider", ms(wf("AWAITING_PROVIDER_REQUEST", { allowed: false, reason: "REQUEST_NOT_APPLICABLE" }, { allowed: false, reason: "MILESTONE_NOT_REQUESTED" })))).not.toContain("request-installment");
    expect(await card("en", "provider", ms(wf("AWAITING_REPORT", { allowed: false, reason: "MILESTONE_ALREADY_REQUESTED" }, { allowed: true, reason: null })))).not.toContain("request-installment");
    expect(await card("en", "provider", ms(wf("DUE_LATER", { allowed: false, reason: "MILESTONE_NOT_DUE" }, { allowed: false, reason: "MILESTONE_NOT_DUE" })))).not.toContain("request-installment");
  });
  it("the station sees a waiting message and no report-transfer button", async () => {
    perms = ["station.job_orders.confirm_sent"];
    for (const [lng, msg] of [["en", "Waiting for the service provider to request this installment"], ["ar", "بانتظار أن يطلب المزوّد هذه الدفعة"]] as const) {
      const html = await card(lng, "station", awaiting);
      expect(html).toContain(msg);
      expect(html).not.toContain('data-testid="report-sent"');
      expect(html).not.toContain('data-testid="report-form"');
      expect(html).not.toContain("request-installment");
    }
  });
  it("legacy / other stages are unchanged: the station reports AWAITING_REPORT as before", async () => {
    perms = [];
    const html = await card("en", "station", ms(wf("AWAITING_REPORT", { allowed: false, reason: null }, { allowed: true, reason: null })));
    expect(html).toContain('data-testid="report-sent"');
  });
});

describe("Chain queues and next actions", () => {
  it("provider review queue lists reports with a deep link and flags the manager's own report", async () => {
    const items = [{ reportId: 11, jobOrderId: 93, externalRequestId: 153, title: "Tank inspection", submittedAt: "2026-11-01T09:00:00.000Z", submittedBy: { id: 9, name: "Tech Tom" }, stage: "PROVIDER_MANAGER", ownReport: true }];
    const html = await render("en", <ProviderReviewQueue />, (qc) => qc.setQueryData(["provider-review-queue"], { items, total: 1 }));
    expect(html).toContain('href="/provider-job-orders/93"');
    expect(html).toContain('data-testid="queue-own-report"');
    expect(await render("ar", <ProviderReviewQueue />, (qc) => qc.setQueryData(["provider-review-queue"], { items: [], total: 0 }))).toContain("لا شيء بانتظار مراجعتك");
  });
  it("the station closure queue renders from its own key", async () => {
    const item = { reportId: 5, jobOrderId: 93, externalRequestId: 153, title: "Tank inspection", branch: null, provider: { id: 1, name: "P" }, submittedAt: null, maintenanceApprovedAt: null, stage: "FINAL_CLOSURE" };
    const html = await render("en", <ExternalWorkReviewQueue stage="closure" />, (qc) => qc.setQueryData(["review-queue", "closure"], { items: [item], total: 1 }));
    expect(html).toContain("Awaiting final closure");
    expect(html).toContain('href="/station-job-orders/93"');
  });
  it("queue routes are gated by their permission and organization type", () => {
    expect(canAccessPath("/external-reviews/closure", "FUEL_STATION", ["external_maintenance_v2.maintenance_review"])).toBe(true);
    expect(canAccessPath("/external-reviews/closure", "FUEL_STATION", ["external_maintenance_v2.ops_closure"])).toBe(false);
    expect(canAccessPath("/provider-review-queue", "SERVICE_PROVIDER", [MGR])).toBe(true);
    expect(canAccessPath("/provider-review-queue", "SERVICE_PROVIDER", ["provider.jobs.execute"])).toBe(false);
    expect(canAccessPath("/provider-review-queue", "FUEL_STATION", [MGR])).toBe(false);
  });
  it("nextJobAction covers the new stages by role", () => {
    const p = { side: "provider" as const, status: "UNDER_REVIEW" };
    expect(nextJobAction({ ...p, reviewStage: "AWAITING_PROVIDER_MANAGER", canReviewReport: true })).toEqual({ key: "provider.managerApprove", actor: "you" });
    expect(nextJobAction({ ...p, reviewStage: "AWAITING_PROVIDER_MANAGER", canReviewReport: false })).toEqual({ key: "provider.waitProviderManager", actor: "other" });
    expect(nextJobAction({ ...p, reviewStage: "AWAITING_FINAL_CLOSURE", canReviewReport: true })).toEqual({ key: "provider.waitFinalClosure", actor: "other" });
    const s = { side: "station" as const, status: "UNDER_REVIEW" };
    expect(nextJobAction({ ...s, reviewStage: "AWAITING_FINAL_CLOSURE", canReviewMaintenance: true })).toEqual({ key: "station.closeWorkOrder", actor: "you" });
    expect(nextJobAction({ ...s, reviewStage: "AWAITING_FINAL_CLOSURE", canReviewOperations: true })).toEqual({ key: "station.waitFinalClosure", actor: "other" });
    expect(nextJobAction({ ...s, reviewStage: "AWAITING_PROVIDER_MANAGER", canReviewMaintenance: true })).toEqual({ key: "station.waitProviderManager", actor: "other" });
    const w = (request: boolean) => [{ id: 1, sequence: 2, percent: "50", trigger: "ON_JOB_CLOSED", amount: null, currency: null, status: "PENDING", receiptUrl: null, referenceNumber: null,
      workflow: { stage: "AWAITING_PROVIDER_REQUEST", due: true, report: { actor: "STATION", allowed: false, reason: "MILESTONE_NOT_REQUESTED" }, confirmReceipt: { actor: "PROVIDER", allowed: false, reason: null }, request: { actor: "PROVIDER_MANAGER", allowed: request, reason: null } } }] as never;
    expect(nextJobAction({ side: "provider", status: "CLOSED", milestones: w(true) })).toEqual({ key: "provider.requestFinalInstallment", actor: "you" });
    expect(nextJobAction({ side: "provider", status: "CLOSED", milestones: w(false) })).toEqual({ key: "provider.waitRequest", actor: "other" });
    expect(nextJobAction({ side: "station", status: "CLOSED", milestones: w(true) })).toEqual({ key: "station.waitProviderRequest", actor: "other" });
  });
  it("legacy stages behave exactly as before", () => {
    expect(nextJobAction({ side: "station", status: "UNDER_REVIEW", reviewStage: "LEGACY_SINGLE_STEP" }).key).toBe("station.review");
    expect(nextJobAction({ side: "provider", status: "UNDER_REVIEW", reviewStage: "AWAITING_OPERATIONS_MANAGER" }).key).toBe("provider.waitOperations");
  });
  it("English and Arabic define the same execution / flow / payments keys", () => {
    const keys = (o: unknown, prefix = ""): string[] => Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
    for (const [a, b] of [[enExec, arExec], [enFlow, arFlow], [enPay, arPay]]) expect(keys(b).sort()).toEqual(keys(a).sort());
  });
});
