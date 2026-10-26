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
    lng, fallbackLng: "en", ns: ["provider", "payments", "common"], defaultNS: "provider",
    resources: { en: { provider: enProvider, payments: enPayments, common: enCommon }, ar: { provider: arProvider, payments: arPayments, common: arCommon } },
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

describe("ProviderRfqDetail — payment installments (RFQ 152 regression)", () => {
  it("resolves the job order from the raw ProviderQuotes when `quotes` is a trimmed summary", async () => {
    const html = await render(rfq(), "en", FINANCE);
    expect(html).toContain('href="/provider-job-orders/92"'); // Job Order link
    expect(html).toContain("Job Order");
    expect(html).toContain('data-testid="milestones-card"');
    expect(count(html, 'data-testid="milestone"')).toBe(2);
  });

  it("the finance user gets Confirm Receipt only for the reported installment; the not-due one has none", async () => {
    const html = await render(rfq(), "en", FINANCE);
    expect(count(html, 'data-testid="confirm-received"')).toBe(1);
    expect(html).toContain("Confirm payment received");
    const [, first, second] = html.split('<li class="space-y-2 rounded-md border p-3" ');
    expect(first).toContain('data-milestone-id="39"');
    expect(first).toContain('data-stage="AWAITING_RECEIPT_CONFIRMATION"');
    expect(first).toContain('data-testid="confirm-received"');
    expect(second).toContain('data-milestone-id="40"');
    expect(second).toContain('data-stage="DUE_LATER"');
    expect(second).not.toContain('data-testid="confirm-received"');
    expect(html).toContain("Awaiting provider confirmation");
    expect(html).toContain("Not due yet");
  });

  it("shows the payment receipt and the installment's receipt link", async () => {
    const html = await render(rfq(), "en", FINANCE);
    expect(html).toContain(RECEIPT);
    expect(html).toContain("Payment receipt");
    expect(html).toContain('data-testid="milestone-receipt"');
    expect(html).toContain("https://files.test/m39.png");
  });

  it("a provider user without payment permissions sees no installments and no payment action", async () => {
    const html = await render(rfq(), "en", ["provider.rfqs.read"]);
    expect(html).not.toContain('data-testid="milestones-card"');
    expect(html).not.toContain('data-testid="confirm-received"');
    expect(html).toContain("RFQ title 152"); // the page itself still renders
  });

  it("read-only finance user: the server saying 'not allowed' hides the button", async () => {
    const denied = milestones.map((m) => ({ ...m, workflow: wf(m.workflow.stage, m.workflow.due, { allowed: false, reason: "INSUFFICIENT_PERMISSIONS" }) }));
    const html = await render(rfq(), "en", ["payments.read"], denied);
    expect(html).toContain('data-testid="milestones-card"');
    expect(html).not.toContain('data-testid="confirm-received"');
  });

  it("renders in Arabic", async () => {
    const html = await render(rfq(), "ar", FINANCE);
    expect(html).toContain("تأكيد استلام الدفعة");
    expect(html).toContain("أمر العمل");
    expect(html).toContain("إيصال الدفع");
    expect(html).not.toContain("Confirm payment received");
    expect(count(html, 'data-testid="confirm-received"')).toBe(1);
  });

  it.each([
    ["no ExternalJobOrder on the selected quote", rfq({ ProviderQuotes: [rawQuote(null)] })],
    ["no ProviderQuotes at all", rfq({ ProviderQuotes: undefined })],
    ["no selected quote", rfq({ ProviderQuotes: [{ ...rawQuote(jobOrder), status: "REJECTED" }] })],
    ["job order without id or payment record", rfq({ ProviderQuotes: [rawQuote({ status: "AWAITING_PAYMENT" })] })],
  ])("missing job-order data (%s) renders the page with no payment UI and no crash", async (_n, data) => {
    for (const lng of ["en", "ar"] as const) {
      const html = await render(data, lng, FINANCE);
      expect(html).toContain("RFQ title 152");
      expect(html).not.toContain('data-testid="milestones-card"');
      expect(html).not.toContain('data-testid="confirm-received"');
      expect(html).not.toContain("/provider-job-orders/");
      expect(html).not.toContain(RECEIPT);
    }
  });
});
