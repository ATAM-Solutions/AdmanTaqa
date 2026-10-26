import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import enPayments from "@/i18n/locales/en/payments.json";
import arPayments from "@/i18n/locales/ar/payments.json";
import enStation from "@/i18n/locales/en/station.json";
import arStation from "@/i18n/locales/ar/station.json";
import enProvider from "@/i18n/locales/en/provider.json";
import arProvider from "@/i18n/locales/ar/provider.json";
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
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { id: 1 }, hasPermission: (p: string) => perms.includes(p), permissions: perms, organization: { id: 1, type: "X" } }),
}));

import PaymentMilestonesCard from "./PaymentMilestonesCard";
import StationJobOrderDetail from "@/pages/Station/StationJobOrderDetail";
import ProviderJobOrderDetail from "@/pages/Provider/ProviderJobOrderDetail";

const wf = (stage: string, due: boolean, report: boolean, confirm: boolean) => ({
  stage, due,
  report: { actor: "STATION", allowed: report, reason: report ? null : "WRONG_ACTOR" },
  confirmReceipt: { actor: "PROVIDER", allowed: confirm, reason: confirm ? null : "PAYMENT_NOT_SENT_YET" },
});
const ms = (id: number, seq: number, pct: number, trigger: string, status: string, workflow: ReturnType<typeof wf>) =>
  ({ id, sequence: seq, percent: String(pct), trigger, amount: "500.000", currency: "OMR", status, receiptUrl: null, referenceNumber: null, workflow });

const SINGLE_REQUESTED = [ms(1, 1, 100, "ON_APPROVAL", "REQUESTED", wf("AWAITING_REPORT", true, true, false))];

async function render(lng: "en" | "ar", client: (qc: QueryClient) => void, ui: React.ReactElement, route = "/x/7", path = "/x/:id") {
  const i = createInstance();
  await i.use(initReactI18next).init({
    lng, fallbackLng: "en", ns: ["payments", "station", "provider", "paymentRecord", "common"], defaultNS: "payments",
    resources: {
      en: { payments: enPayments, station: enStation, provider: enProvider, paymentRecord: enPaymentRecord, common: enCommon },
      ar: { payments: arPayments, station: arStation, provider: arProvider, paymentRecord: arPaymentRecord, common: arCommon },
    },
    interpolation: { escapeValue: false },
  });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client(qc);
  return renderToStaticMarkup(
    <QueryClientProvider client={qc}>
      <I18nextProvider i18n={i}>
        <MemoryRouter initialEntries={[route]}><Routes><Route path={path} element={ui} /></Routes></MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe("installment card — a single 100% payment and who acts next", () => {
  it("station: the single 100% milestone says it is the station's step, with one report form and no duplicate", async () => {
    const html = await render("en", (qc) => qc.setQueryData(["payment-milestones", "station", "7"], SINGLE_REQUESTED), <PaymentMilestonesCard side="station" jobOrderId={7} />);
    expect(html).toContain("100%");
    expect(html).toContain('data-next="you.report"');
    expect(html).toContain("Your step: report this payment");
    expect(html.split('data-testid="report-sent"').length - 1).toBe(1);
    expect(html).not.toContain("confirm-received");
  });
  it("provider: before the station reports it only says it is waiting for the station", async () => {
    const html = await render("en", (qc) => qc.setQueryData(["payment-milestones", "provider", "7"], SINGLE_REQUESTED), <PaymentMilestonesCard side="provider" jobOrderId={7} />);
    expect(html).toContain('data-next="waiting.station"');
    expect(html).toContain("Waiting for the station to report this payment.");
    expect(html).not.toContain('data-testid="confirm-received"');
  });
  it("after the report: provider's step is to confirm; the station is told not to pay again", async () => {
    const sent = [ms(1, 1, 100, "ON_APPROVAL", "SENT_BY_STATION", wf("AWAITING_RECEIPT_CONFIRMATION", true, false, true))];
    const p = await render("en", (qc) => qc.setQueryData(["payment-milestones", "provider", "7"], sent), <PaymentMilestonesCard side="provider" jobOrderId={7} />);
    expect(p).toContain('data-next="you.confirm"');
    expect(p.split('data-testid="confirm-received"').length - 1).toBe(1);
    const st = await render("en", (qc) => qc.setQueryData(["payment-milestones", "station", "7"], sent.map((m) => ({ ...m, workflow: wf("AWAITING_RECEIPT_CONFIRMATION", true, false, false) }))), <PaymentMilestonesCard side="station" jobOrderId={7} />);
    expect(st).toContain('data-next="waiting.provider"');
    expect(st).toContain("do not send this payment again");
    expect(st).not.toContain('data-testid="report-sent"');
  });
  it("a later installment that is not due shows no next-step line and no action", async () => {
    const plan = [
      ms(1, 1, 60, "ON_APPROVAL", "CONFIRMED_BY_PROVIDER", wf("SETTLED", true, false, false)),
      ms(2, 2, 40, "ON_JOB_CLOSED", "PENDING", wf("DUE_LATER", false, false, false)),
    ];
    const html = await render("en", (qc) => qc.setQueryData(["payment-milestones", "station", "7"], plan), <PaymentMilestonesCard side="station" jobOrderId={7} />);
    expect(html).not.toContain("data-next=");
    expect(html).not.toContain('data-testid="report-sent"');
    expect(html).toContain("Settled");
    expect(html).toContain("Not due yet");
  });
  it("Arabic wording", async () => {
    const html = await render("ar", (qc) => qc.setQueryData(["payment-milestones", "station", "7"], SINGLE_REQUESTED), <PaymentMilestonesCard side="station" jobOrderId={7} />);
    expect(html).toContain("خطوتك: أبلغ عن هذه الدفعة");
    const p = await render("ar", (qc) => qc.setQueryData(["payment-milestones", "provider", "7"], SINGLE_REQUESTED), <PaymentMilestonesCard side="provider" jobOrderId={7} />);
    expect(p).toContain("بانتظار أن تبلّغ المحطة");
  });
});

const stationOrder = { id: 7, status: "AWAITING_PAYMENT", paymentRecord: { status: "NOT_STARTED" }, ExternalRequest: { formData: {} } };
const stationUi = <StationJobOrderDetail />;

describe("legacy single-payment form (station job order page)", () => {
  const seed = (milestones: unknown) => (qc: QueryClient) => {
    qc.setQueryData(["station-job-order", "7"], stationOrder);
    qc.setQueryData(["payment-milestones", "station", "7"], milestones);
  };
  it("is HIDDEN when the job has installments (no duplicate payment-submission buttons)", async () => {
    const html = await render("en", seed(SINGLE_REQUESTED), stationUi, "/station-job-orders/7", "/station-job-orders/:id");
    expect(html).not.toContain('data-testid="legacy-payment-form"');
    expect(html).toContain('data-testid="milestones-card"');
    expect(html.split('data-testid="report-sent"').length - 1).toBe(1);
  });
  it("is SHOWN for a historical job without installments", async () => {
    const html = await render("en", seed([]), stationUi, "/station-job-orders/7", "/station-job-orders/:id");
    expect(html).toContain('data-testid="legacy-payment-form"');
  });
  it("is not shown while the schedule is still loading (never a flash of the wrong form)", async () => {
    const html = await render("en", (qc) => qc.setQueryData(["station-job-order", "7"], stationOrder), stationUi, "/station-job-orders/7", "/station-job-orders/:id");
    expect(html).not.toContain('data-testid="legacy-payment-form"');
  });
});

describe("legacy confirm button (provider job order page)", () => {
  const providerOrder = { id: 7, status: "AWAITING_PAYMENT", paymentRecord: { status: "STATION_CONFIRMED_SENT", referenceNumber: "OLD", amount: 500 } };
  const seed = (milestones: unknown) => (qc: QueryClient) => {
    qc.setQueryData(["provider-job-order", "7"], providerOrder);
    qc.setQueryData(["payment-milestones", "provider", "7"], milestones);
  };
  const FINANCE = ["payments.read", "provider.payments.confirm_received"];
  it("hidden for a job with installments (the record stays readable)", async () => {
    perms = FINANCE;
    const html = await render("en", seed(SINGLE_REQUESTED), <ProviderJobOrderDetail />, "/provider-job-orders/7", "/provider-job-orders/:id");
    expect(html).not.toContain('data-testid="payment-confirm-received"');
    expect(html).toContain("OLD");
  });
  it("still offered for a historical job without installments", async () => {
    perms = FINANCE;
    const html = await render("en", seed([]), <ProviderJobOrderDetail />, "/provider-job-orders/7", "/provider-job-orders/:id");
    expect(html).toContain('data-testid="payment-confirm-received"');
  });
});
