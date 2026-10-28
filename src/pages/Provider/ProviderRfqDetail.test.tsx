import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import enProvider from "@/i18n/locales/en/provider.json";
import arProvider from "@/i18n/locales/ar/provider.json";
import enPayments from "@/i18n/locales/en/payments.json";
import arPayments from "@/i18n/locales/ar/payments.json";
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
vi.mock("./QuotationForm", () => ({ default: () => null }));
let perms: string[] = [];
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { id: 1 }, hasPermission: (p: string) => perms.includes(p), permissions: perms }),
}));

import ProviderRfqDetail from "./ProviderRfqDetail";

const FINANCE = ["payments.read", "provider.payments.confirm_received"];
const RECEIPT = "https://files.test/receipt-152.png";

// What GET /provider/rfqs/152 returns for the selected quote: `quotes` is the trimmed summary (no job order),
// the job order only lives on the raw `ProviderQuotes`.
const summaryQuote = { id: 110, status: "SELECTED", paymentType: "INSTALLMENTS", attachments: [], quotePaymentTerms: [] };
const rawQuote = (jobOrder: unknown) => ({ id: 110, status: "SELECTED", serviceProviderOrganizationId: 173, ExternalJobOrder: jobOrder });
const jobOrder = { id: 92, status: "AWAITING_PAYMENT", PaymentRecord: { status: "NOT_STARTED", receiptFileUrl: RECEIPT } };
const rfq = (over: Record<string, unknown> = {}) => ({
  id: 152, status: "AWAITING_PAYMENT", createdAt: "2026-10-26T13:56:03.000Z", formData: { title: "RFQ title 152", description: "d", priority: "LOW" },
  quotes: [summaryQuote], ProviderQuotes: [rawQuote(jobOrder)], ...over,
});

const wf = (stage: string, due: boolean, confirm: { allowed: boolean; reason: string | null }) => ({
  stage, due, report: { actor: "STATION", allowed: false, reason: "WRONG_ACTOR" }, confirmReceipt: { actor: "PROVIDER", ...confirm },
});
const milestones = [
  { id: 39, sequence: 1, percent: "82.00", trigger: "ON_APPROVAL", amount: "728.160", currency: "SAR", status: "SENT_BY_STATION", receiptUrl: "https://files.test/m39.png", referenceNumber: "45678",
    workflow: wf("AWAITING_RECEIPT_CONFIRMATION", true, { allowed: true, reason: null }) },
  { id: 40, sequence: 2, percent: "18.00", trigger: "ON_JOB_CLOSED", amount: "159.840", currency: "SAR", status: "PENDING", receiptUrl: null, referenceNumber: null,
    workflow: wf("DUE_LATER", false, { allowed: false, reason: "PAYMENT_NOT_SENT_YET" }) },
];

async function render(data: unknown, lng: "en" | "ar", p: string[], ms: unknown = milestones) {
  perms = p;
  const i = createInstance();
  await i.use(initReactI18next).init({
    lng, fallbackLng: "en", ns: ["provider", "payments", "flow", "common"], defaultNS: "provider",
    resources: { en: { provider: enProvider, payments: enPayments, flow: enFlow, common: enCommon }, ar: { provider: arProvider, payments: arPayments, flow: arFlow, common: arCommon } },
    interpolation: { escapeValue: false },
  });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  qc.setQueryData(["provider-rfq", "152"], data);
  qc.setQueryData(["payment-milestones", "provider", "92"], ms);
  return renderToStaticMarkup(
    <QueryClientProvider client={qc}>
      <I18nextProvider i18n={i}>
        <MemoryRouter initialEntries={["/provider-rfqs/152"]}>
          <Routes><Route path="/provider-rfqs/:id" element={<ProviderRfqDetail />} /></Routes>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}
const count = (html: string, s: string) => html.split(s).length - 1;

const noActions = (html: string) => {
  // Phase 2: payment actions live on the job order only
  expect(html).not.toContain('data-testid="confirm-received"');
  expect(html).not.toContain('data-testid="report-sent"');
  expect(html).not.toContain('data-testid="milestones-card"');
  expect(html).not.toContain('data-testid="receipt-input"');
};

describe("ProviderRfqDetail — Phase 2: invitation + quotation page, payments are summary-only", () => {
  it("resolves the job order from the raw ProviderQuotes and shows a prominent Open Job Order link", async () => {
    const html = await render(rfq(), "en", FINANCE);
    expect(html).toContain('data-testid="job-order-cta"');
    expect(html).toContain('data-testid="open-job-order"');
    expect(html).toContain('href="/provider-job-orders/92"');
    expect(html).toContain("Open Job Order");
    expect(count(html, 'data-testid="open-job-order"')).toBe(1);
  });

  it("shows a read-only payment progress summary and no payment action, for the finance user", async () => {
    const html = await render(rfq(), "en", FINANCE);
    expect(html).toContain('data-testid="payment-summary"');
    expect(html).toContain("0 of 2 installments settled");
    expect(html).toContain("Waiting for the provider to confirm receipt: 1");
    expect(html).toContain("Next: the provider confirms receipt.");
    expect(html).toContain('data-testid="payment-summary-manage"');
    noActions(html);
    expect(html).not.toContain("Confirm payment received");
  });

  it("pending vs confirmed installments change the summary, never the buttons", async () => {
    const settled = milestones.map((m, i) => i === 0 ? { ...m, status: "CONFIRMED_BY_PROVIDER", workflow: { ...wf("SETTLED", true, { allowed: false, reason: "MILESTONE_ALREADY_CONFIRMED" }) } } : m);
    const html = await render(rfq(), "en", FINANCE, settled);
    expect(html).toContain("1 of 2 installments settled");
    expect(html).toContain("82% of the contract value");
    noActions(html);
  });

  it("still shows the legacy payment receipt read-only", async () => {
    const html = await render(rfq(), "en", FINANCE);
    expect(html).toContain(RECEIPT);
    expect(html).toContain("Payment receipt");
  });

  it("links the RFQ, quotation and job order in a breadcrumb and from the quote row", async () => {
    const html = await render(rfq(), "en", [...FINANCE, "quotations:read"]);
    expect(html).toContain('data-testid="flow-breadcrumb"');
    expect(html).toContain('href="/quotations/110"');
    expect(html).toContain('data-crumb="quotation"');
    expect(html).toContain('data-crumb="jobOrder"');
    expect(html).toContain('data-testid="open-quotation"');
  });

  it("does not offer a quotation link to a user without quotation access", async () => {
    const html = await render(rfq(), "en", FINANCE);
    expect(html).not.toContain('href="/quotations/110"');
    expect(html).not.toContain('data-testid="open-quotation"');
  });

  it("a provider user without payment permissions sees no payment summary and no payment action", async () => {
    const html = await render(rfq(), "en", ["provider.rfqs.read"]);
    expect(html).not.toContain('data-testid="payment-summary"');
    noActions(html);
    expect(html).toContain("RFQ title 152");
    expect(html).toContain('data-testid="open-job-order"'); // navigation is not a payment action
  });

  it("renders in Arabic", async () => {
    const html = await render(rfq(), "ar", FINANCE);
    expect(html).toContain("فتح أمر العمل");
    expect(html).toContain("تقدم الدفعات");
    expect(html).toContain("إيصال الدفع");
    expect(html).not.toContain("Open Job Order");
    noActions(html);
  });

  it.each([
    ["no ExternalJobOrder on the selected quote", rfq({ ProviderQuotes: [rawQuote(null)] }), true],
    ["no ProviderQuotes at all (only the trimmed summary says SELECTED)", rfq({ ProviderQuotes: undefined }), true],
    ["no selected quote", rfq({ ProviderQuotes: [{ ...rawQuote(jobOrder), status: "REJECTED" }] }), false],
    ["job order without id or payment record", rfq({ ProviderQuotes: [rawQuote({ status: "AWAITING_PAYMENT" })] }), true],
  ])("missing job-order data (%s) renders the page with no payment UI and no crash", async (_n, data, selected) => {
    for (const lng of ["en", "ar"] as const) {
      const html = await render(data, lng, FINANCE);
      expect(html).toContain("RFQ title 152");
      noActions(html);
      expect(html).not.toContain('data-testid="payment-summary"');
      expect(html).not.toContain("/provider-job-orders/");
      expect(html).not.toContain(RECEIPT);
      expect(html.includes('data-testid="job-order-missing"')).toBe(selected);
    }
  });
});
