import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import enFlow from "@/i18n/locales/en/flow.json";
import arFlow from "@/i18n/locales/ar/flow.json";
import enPayments from "@/i18n/locales/en/payments.json";
import arPayments from "@/i18n/locales/ar/payments.json";
import enProvider from "@/i18n/locales/en/provider.json";
import arProvider from "@/i18n/locales/ar/provider.json";
import enStation from "@/i18n/locales/en/station.json";
import arStation from "@/i18n/locales/ar/station.json";
import enQuotations from "@/i18n/locales/en/quotations.json";
import arQuotations from "@/i18n/locales/ar/quotations.json";
import enPaymentRecord from "@/i18n/locales/en/paymentRecord.json";
import arPaymentRecord from "@/i18n/locales/ar/paymentRecord.json";
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
let orgType = "SERVICE_PROVIDER";
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: 1 }, hasPermission: (p: string) => perms.includes(p), permissions: perms,
    organization: { id: 1, type: orgType, status: "APPROVED" },
  }),
}));
vi.mock("@/hooks/Organization/useGetOrganization", () => ({
  default: () => ({ data: { data: { id: 1, type: orgType, status: "APPROVED" } }, isLoading: false }),
}));

import { nextJobAction, summarizePayments } from "@/lib/externalFlow";
import type { Milestone } from "@/api/services/paymentMilestoneService";
import Quotations from "@/pages/Quotations/Quotations";
import QuotationDetail from "@/pages/Quotations/QuotationDetail";
import ProviderJobOrderDetail from "@/pages/Provider/ProviderJobOrderDetail";
import StationJobOrderDetail from "@/pages/Station/StationJobOrderDetail";
import StationRequestDetail from "@/pages/Station/StationRequestDetail";

// ---------------------------------------------------------------- fixtures
const wf = (stage: string, due: boolean, report: boolean, confirm: boolean) => ({
  stage, due,
  report: { actor: "STATION", allowed: report, reason: report ? null : "WRONG_ACTOR" },
  confirmReceipt: { actor: "PROVIDER", allowed: confirm, reason: confirm ? null : "PAYMENT_NOT_SENT_YET" },
});
const ms = (id: number, seq: number, pct: number, trigger: string, status: string, workflow: ReturnType<typeof wf>) =>
  ({ id, sequence: seq, percent: String(pct), trigger, amount: "500.000", currency: "OMR", status, receiptUrl: null, referenceNumber: null, workflow }) as unknown as Milestone;

const SINGLE_REQUESTED = [ms(1, 1, 100, "ON_APPROVAL", "REQUESTED", wf("AWAITING_REPORT", true, true, false))];
const PROVIDER_SEES_REQUESTED = [ms(1, 1, 100, "ON_APPROVAL", "REQUESTED", wf("AWAITING_REPORT", true, false, false))];
const SENT_PROVIDER = [ms(1, 1, 60, "ON_APPROVAL", "SENT_BY_STATION", wf("AWAITING_RECEIPT_CONFIRMATION", true, false, true)), ms(2, 2, 40, "ON_JOB_CLOSED", "PENDING", wf("DUE_LATER", false, false, false))];
const SENT_STATION = SENT_PROVIDER.map((m, i) => i === 0 ? ({ ...m, workflow: wf("AWAITING_RECEIPT_CONFIRMATION", true, false, false) } as Milestone) : m);
const SETTLED_ALL = [ms(1, 1, 60, "ON_APPROVAL", "CONFIRMED_BY_PROVIDER", wf("SETTLED", true, false, false)), ms(2, 2, 40, "ON_JOB_CLOSED", "CONFIRMED_BY_PROVIDER", wf("SETTLED", true, false, false))];

const FINANCE = ["payments.read", "provider.payments.confirm_received", "quotations:read"];

async function render(lng: "en" | "ar", seed: (qc: QueryClient) => void, ui: React.ReactElement, route: string, path: string) {
  const i = createInstance();
  await i.use(initReactI18next).init({
    lng, fallbackLng: "en",
    ns: ["flow", "payments", "provider", "station", "quotations", "paymentRecord", "common"], defaultNS: "common",
    resources: {
      en: { flow: enFlow, payments: enPayments, provider: enProvider, station: enStation, quotations: enQuotations, paymentRecord: enPaymentRecord, common: enCommon },
      ar: { flow: arFlow, payments: arPayments, provider: arProvider, station: arStation, quotations: arQuotations, paymentRecord: arPaymentRecord, common: arCommon },
    },
    interpolation: { escapeValue: false },
  });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  seed(qc);
  return renderToStaticMarkup(
    <QueryClientProvider client={qc}>
      <I18nextProvider i18n={i}>
        <MemoryRouter initialEntries={[route]}><Routes><Route path={path} element={ui} /></Routes></MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}
const count = (html: string, s: string) => html.split(s).length - 1;
const noPaymentActions = (html: string) => {
  for (const id of ["report-sent", "confirm-received", "receipt-input", "report-form", "legacy-payment-form", "payment-confirm-received"]) {
    expect(html).not.toContain(`data-testid="${id}"`);
  }
};

// ---------------------------------------------------------------- pure logic
describe("summarizePayments / nextJobAction", () => {
  it("rolls up pending and confirmed installments", () => {
    const p = summarizePayments([...SETTLED_ALL.slice(0, 1), SENT_PROVIDER[1]]);
    expect(p).toMatchObject({ total: 2, settled: 1, dueLater: 1, settledPercent: 60, waitingOn: null });
    expect(summarizePayments(SENT_PROVIDER).waitingOn).toBe("PROVIDER");
    expect(summarizePayments(SINGLE_REQUESTED).waitingOn).toBe("STATION");
  });
  it("payment steps come first, per role", () => {
    expect(nextJobAction({ side: "station", status: "AWAITING_PAYMENT", milestones: SINGLE_REQUESTED })).toEqual({ key: "station.reportPayment", actor: "you" });
    expect(nextJobAction({ side: "provider", status: "AWAITING_PAYMENT", milestones: PROVIDER_SEES_REQUESTED })).toEqual({ key: "provider.waitStationPayment", actor: "other" });
    expect(nextJobAction({ side: "provider", status: "AWAITING_PAYMENT", milestones: SENT_PROVIDER })).toEqual({ key: "provider.confirmPayment", actor: "you" });
    expect(nextJobAction({ side: "station", status: "AWAITING_PAYMENT", milestones: SENT_STATION })).toEqual({ key: "station.waitProviderConfirm", actor: "other" });
  });
  it("then the execution state", () => {
    expect(nextJobAction({ side: "provider", status: "ACTIVE", milestones: SETTLED_ALL, operatorCount: 0 }).key).toBe("provider.assignOperator");
    expect(nextJobAction({ side: "provider", status: "ACTIVE", milestones: SETTLED_ALL, operatorCount: 2 }).key).toBe("provider.work");
    expect(nextJobAction({ side: "station", status: "UNDER_REVIEW", milestones: SETTLED_ALL })).toEqual({ key: "station.review", actor: "you" });
    expect(nextJobAction({ side: "provider", status: "UNDER_REVIEW", milestones: SETTLED_ALL })).toEqual({ key: "provider.waitReview", actor: "other" });
    expect(nextJobAction({ side: "provider", status: "REWORK_REQUIRED" }).key).toBe("provider.rework");
    expect(nextJobAction({ side: "provider", status: "CLOSED" }).actor).toBe("none");
    expect(nextJobAction({ side: "station", status: "CANCELLED", milestones: SINGLE_REQUESTED }).key).toBe("none.cancelled");
  });
  it("historical single-payment job: station is told to confirm, provider is not offered anything on its own", () => {
    expect(nextJobAction({ side: "station", status: "AWAITING_PAYMENT", milestones: [], legacyAwaitingStation: true }).key).toBe("station.legacyPayment");
    expect(nextJobAction({ side: "station", status: "AWAITING_PAYMENT", paymentRejected: true }).key).toBe("station.paymentRejected");
  });
});

// ---------------------------------------------------------------- Job orders: the only place with payment actions
describe("Provider job order page", () => {
  const order = { id: 92, status: "AWAITING_PAYMENT", externalRequestId: 152, providerQuoteId: 110, paymentRecord: { status: "NOT_STARTED" }, externalJobAssignments: [] };
  const seed = (m: unknown) => (qc: QueryClient) => { qc.setQueryData(["provider-job-order", "92"], order); qc.setQueryData(["payment-milestones", "provider", "92"], m); };
  const go = (lng: "en" | "ar", m: unknown, p = FINANCE) => { perms = p; return render(lng, seed(m), <ProviderJobOrderDetail />, "/provider-job-orders/92", "/provider-job-orders/:id"); };

  it("has the only Confirm Receipt button, and says it is the provider's step", async () => {
    const html = await go("en", SENT_PROVIDER);
    expect(count(html, 'data-testid="confirm-received"')).toBe(1);
    expect(html).toContain('data-next-key="provider.confirmPayment"');
    expect(html).toContain('data-actor="you"');
  });
  it("before the station reports: waiting, no button", async () => {
    const html = await go("en", PROVIDER_SEES_REQUESTED);
    expect(html).toContain('data-next-key="provider.waitStationPayment"');
    expect(html).toContain('data-actor="other"');
    noPaymentActions(html);
  });
  it("breadcrumb links RFQ → Quotation → Job order", async () => {
    const html = await go("en", SENT_PROVIDER);
    expect(html).toContain('href="/provider-rfqs/152"');
    expect(html).toContain('href="/quotations/110"');
    expect(html).toMatch(/aria-current="page"[^>]*data-crumb="jobOrder"/);
  });
  it("without quotation access the quotation step is not a link", async () => {
    const html = await go("en", SENT_PROVIDER, ["payments.read", "provider.payments.confirm_received"]);
    expect(html).not.toContain('href="/quotations/110"');
    expect(html).toContain('href="/provider-rfqs/152"');
  });
  it("Arabic", async () => {
    const html = await go("ar", SENT_PROVIDER);
    expect(html).toContain("خطوتك");
    expect(html).toContain("أكّد استلام الدفعة المبلّغ عنها");
    expect(html).toContain("تأكيد استلام الدفعة");
  });
  it("job order without RFQ/quote ids: no breadcrumb, no crash", async () => {
    perms = FINANCE;
    const html = await render("en", (qc) => { qc.setQueryData(["provider-job-order", "92"], { id: 92, status: "ACTIVE" }); qc.setQueryData(["payment-milestones", "provider", "92"], SETTLED_ALL); }, <ProviderJobOrderDetail />, "/provider-job-orders/92", "/provider-job-orders/:id");
    expect(html).not.toContain('data-testid="flow-breadcrumb"');
    expect(html).toContain('data-next-key="provider.assignOperator"');
  });
});

describe("Station job order page", () => {
  const order = { id: 7, status: "AWAITING_PAYMENT", externalRequestId: 152, paymentRecord: { status: "NOT_STARTED" }, ExternalRequest: { formData: {} } };
  const go = (lng: "en" | "ar", m: unknown, o: Record<string, unknown> = order) =>
    render(lng, (qc) => { qc.setQueryData(["station-job-order", "7"], o); qc.setQueryData(["payment-milestones", "station", "7"], m); }, <StationJobOrderDetail />, "/station-job-orders/7", "/station-job-orders/:id");

  it("has the one report form and says it is the station's step", async () => {
    perms = ["station.job_orders.confirm_sent"]; orgType = "FUEL_STATION";
    const html = await go("en", SINGLE_REQUESTED);
    expect(count(html, 'data-testid="report-sent"')).toBe(1);
    expect(html).toContain('data-next-key="station.reportPayment"');
    expect(html).toContain('href="/station-requests/152"');
  });
  it("after reporting: wait, and no second report button", async () => {
    perms = []; orgType = "FUEL_STATION";
    const html = await go("en", SENT_STATION);
    expect(html).toContain('data-next-key="station.waitProviderConfirm"');
    noPaymentActions(html);
  });
  it("completion review is the station's next step once the job is under review", async () => {
    orgType = "FUEL_STATION";
    const html = await go("ar", SETTLED_ALL, { ...order, status: "UNDER_REVIEW" });
    expect(html).toContain('data-next-key="station.review"');
    expect(html).toContain("راجع العمل المنجز");
  });
  it("historical job: legacy form remains here and the banner points to it", async () => {
    orgType = "FUEL_STATION";
    const html = await go("en", []);
    expect(html).toContain('data-testid="legacy-payment-form"');
    expect(html).toContain('data-next-key="station.legacyPayment"');
  });
});

// ---------------------------------------------------------------- Station request page: summary only
describe("Station request page", () => {
  const req = (job: unknown) => ({ id: 152, status: "AWAITING_PAYMENT", title: "T", quotes: [], jobOrders: job ? [job] : [], recipients: [] });
  const go = (lng: "en" | "ar", job: unknown, m?: unknown) =>
    render(lng, (qc) => { qc.setQueryData(["station-request", "152"], req(job)); if (m) qc.setQueryData(["payment-milestones", "station", "7"], m); }, <StationRequestDetail />, "/station-requests/152", "/station-requests/:id");

  it("shows the progress summary and a link to the job order, with no payment form or button (installments)", async () => {
    orgType = "FUEL_STATION"; perms = [];
    const html = await go("en", { id: 7, status: "AWAITING_PAYMENT", paymentRecord: { status: "NOT_STARTED" } }, SINGLE_REQUESTED);
    expect(html).toContain('data-testid="payment-summary"');
    expect(html).toContain('href="/station-job-orders/7"');
    expect(html).toContain("Open Job Order");
    noPaymentActions(html);
    expect(html).not.toContain("data-testid=\"milestones-card\"");
  });
  it("a historical job without installments no longer has a second payment form here", async () => {
    orgType = "FUEL_STATION"; perms = [];
    const html = await go("en", { id: 7, status: "AWAITING_PAYMENT", paymentRecord: { status: "NOT_STARTED" } }, []);
    expect(html).toContain('href="/station-job-orders/7"');
    expect(html).not.toContain("type=\"file\"");
    expect(html).toContain("Single-payment record (historical job).");
  });
  it("no job order yet: no summary, no link, no crash", async () => {
    orgType = "FUEL_STATION"; perms = [];
    const html = await go("en", null);
    expect(html).not.toContain('data-testid="payment-summary"');
    expect(html).not.toContain("/station-job-orders/");
  });
  it("Arabic", async () => {
    orgType = "FUEL_STATION"; perms = [];
    const html = await go("ar", { id: 7, status: "AWAITING_PAYMENT", paymentRecord: { status: "NOT_STARTED" } }, SENT_STATION);
    expect(html).toContain("فتح أمر العمل");
    expect(html).toContain("التالي: يؤكد المزوّد استلام الدفعة.");
  });
});

// ---------------------------------------------------------------- Quotations
const webItem = (over: Record<string, unknown> = {}) => ({
  id: 110, status: "SELECTED", version: 1, externalRequestId: 152, createdAt: "2026-10-26T13:00:00.000Z", paymentType: "INSTALLMENTS", hasAttachments: false, totalCost: 888,
  ExternalRequest: { id: 152, formData: { title: "Pump repair" }, Branch: { nameEn: "B1" }, Organization: { name: "Station A" } }, ...over,
});
const rfqWithJob = (jobOrder: unknown) => ({ id: 152, status: "IN_EXECUTION", ProviderQuotes: [{ id: 110, status: "SELECTED", ExternalJobOrder: jobOrder }] });
const legacyRow = { id: 5, serviceRequestId: 9, status: "SUBMITTED", createdAt: "2025-01-01T00:00:00.000Z", QuotationPricing: { amount: "300", currency: "SAR" }, ServiceRequest: { id: 9, status: "PENDING", formData: { priority: "high", description: "Legacy pump" } }, Organization: { id: 1, name: "Prov" } };

describe("Quotations page", () => {
  const go = (lng: "en" | "ar", opts: { web?: unknown[]; rfq?: unknown; route?: string } = {}) =>
    render(lng, (qc) => {
      qc.setQueryData(["quotations-web", 1, 20, undefined], { items: opts.web ?? [webItem()], total: (opts.web ?? [1]).length, page: 1, limit: 20 });
      qc.setQueryData(["quotations", 1, 50], { items: [legacyRow], total: 1, page: 1, limit: 50 });
      if (opts.rfq !== undefined) qc.setQueryData(["provider-rfq", 152], opts.rfq);
    }, <Quotations />, opts.route ?? "/quotations", "/quotations");

  it("provider: current ProviderQuotes by default, with links to the RFQ and the job order and no payment action", async () => {
    orgType = "SERVICE_PROVIDER"; perms = ["quotations:read", "quotations:submit"];
    const html = await go("en", { rfq: rfqWithJob({ id: 92 }) });
    expect(html).toContain("Pump repair");
    expect(html).toContain('href="/provider-rfqs/152"');
    expect(html).toContain('href="/provider-job-orders/92"');
    expect(html).toContain('href="/quotations/110"');
    expect(html).toContain('data-testid="quotations-tabs"');
    expect(html).not.toContain('data-testid="legacy-note"');
    expect(html).not.toContain("Legacy pump");
    // the legacy-style "submit offer" dialog belongs with the legacy list
    expect(html).not.toContain("Submit New Offer");
    noPaymentActions(html);
  });
  it("provider: SELECTED quote without a job order says so instead of linking", async () => {
    orgType = "SERVICE_PROVIDER"; perms = ["quotations:read"];
    const html = await go("en", { rfq: rfqWithJob(null) });
    expect(html).toContain('data-testid="job-order-missing"');
    expect(html).not.toContain("/provider-job-orders/");
  });
  it("provider: a quote that is not selected has no job-order link", async () => {
    orgType = "SERVICE_PROVIDER"; perms = ["quotations:read"];
    const html = await go("en", { web: [webItem({ status: "SUBMITTED" })] });
    expect(html).toContain('href="/provider-rfqs/152"');
    expect(html).not.toContain("/provider-job-orders/");
    expect(html).not.toContain('data-testid="job-order-missing"');
  });
  it("provider: the legacy tab lists the old offers, labelled as legacy, with no RFQ or job-order links", async () => {
    orgType = "SERVICE_PROVIDER"; perms = ["quotations:read", "quotations:submit"];
    const html = await go("en", { route: "/quotations?tab=legacy" });
    expect(html).toContain('data-testid="legacy-note"');
    expect(html).toContain("Legacy pump");
    expect(html).not.toContain("Pump repair");
    expect(html).not.toContain("/provider-job-orders/");
    expect(html).toContain("Submit New Offer");
  });
  it("station owner: only the legacy list, labelled legacy, and no provider-quotation tabs", async () => {
    orgType = "FUEL_STATION"; perms = ["quotations:read"];
    const html = await go("en");
    expect(html).toContain('data-testid="legacy-note"');
    expect(html).toContain("Legacy pump");
    expect(html).not.toContain('data-testid="quotations-tabs"');
    expect(html).not.toContain("Pump repair");
    noPaymentActions(html);
  });
  it("Arabic", async () => {
    orgType = "SERVICE_PROVIDER"; perms = ["quotations:read"];
    const html = await go("ar", { rfq: rfqWithJob({ id: 92 }) });
    expect(html).toContain("فتح أمر العمل");
    expect(html).toContain("فتح طلب عرض السعر");
    expect(html).toContain("العروض القديمة");
  });
});

describe("Quotation detail page", () => {
  const detail = (over: Record<string, unknown> = {}) => ({ ...webItem(), QuotePaymentTerms: [{ sequence: 1, percent: 60, trigger: "ON_APPROVAL" }, { sequence: 2, percent: 40, trigger: "ON_JOB_CLOSED" }], ProviderQuoteRevisions: [], ...over });
  const go = (lng: "en" | "ar", q: unknown, rfq: unknown, m?: unknown) =>
    render(lng, (qc) => {
      qc.setQueryData(["quotations-web", "110"], q);
      if (rfq !== undefined) qc.setQueryData(["provider-rfq", 152], rfq);
      if (m !== undefined) qc.setQueryData(["payment-milestones", "provider", "92"], m);
    }, <QuotationDetail />, "/quotations/110", "/quotations/:id");

  it("shows terms, breadcrumb, RFQ + Job Order links and a read-only payment summary (pending + confirmed)", async () => {
    orgType = "SERVICE_PROVIDER"; perms = FINANCE;
    const mixed = [SETTLED_ALL[0], SENT_PROVIDER[1]];
    const html = await go("en", detail(), rfqWithJob({ id: 92 }), mixed);
    expect(html).toContain('data-testid="flow-breadcrumb"');
    expect(html).toContain('href="/provider-rfqs/152"');
    expect(html).toContain('href="/provider-job-orders/92"');
    expect(html).toContain("1 of 2 installments settled");
    expect(html).toContain('data-testid="payment-summary-manage"');
    expect(html).toContain("Payment terms");
    noPaymentActions(html);
  });
  it("no job order yet: RFQ link and a clear message, no summary", async () => {
    orgType = "SERVICE_PROVIDER"; perms = FINANCE;
    const html = await go("en", detail(), rfqWithJob(null));
    expect(html).toContain('href="/provider-rfqs/152"');
    expect(html).toContain('data-testid="job-order-missing"');
    expect(html).not.toContain('data-testid="payment-summary"');
  });
  it("viewer without payment permission gets no payment summary", async () => {
    orgType = "SERVICE_PROVIDER"; perms = ["quotations:read"];
    const html = await go("en", detail(), rfqWithJob({ id: 92 }), SENT_PROVIDER);
    expect(html).not.toContain('data-testid="payment-summary"');
    expect(html).toContain('href="/provider-job-orders/92"');
  });
  it("Arabic", async () => {
    orgType = "SERVICE_PROVIDER"; perms = FINANCE;
    const html = await go("ar", detail(), rfqWithJob({ id: 92 }), SENT_PROVIDER);
    expect(html).toContain("تقدم الدفعات");
    expect(html).toContain("فتح أمر العمل");
    noPaymentActions(html);
  });
});
