import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import enFinance from "@/i18n/locales/en/finance.json";
import arFinance from "@/i18n/locales/ar/finance.json";
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

import Reconciliation from "./Reconciliation";
import ReconciliationJob from "./ReconciliationJob";
import { canAccessPath } from "@/lib/accessControl";
import type { ReconJob, ReconReport, ReconRow } from "@/api/services/reconciliationService";

const row151: ReconRow = {
  jobOrderId: 91, requestId: 151, quoteId: 109, jobStatus: "ACTIVE",
  stationOrganization: { id: 172, name: "Station A" }, providerOrganization: { id: 173, name: "Provider P" },
  currency: "SAR", currencyAssumedForLegacyPayment: true, quoteTotal: "900.000", paymentSystem: "MIXED",
  legacyPayment: { id: 91, status: "PROVIDER_CONFIRMED_RECEIVED", amount: "500.000", hasReference: true, hasReceipt: false, reportedAt: "2026-10-25T14:25:43.000Z", confirmedAt: "2026-10-26T17:29:41.000Z" },
  installments: { count: 2, scheduleTotal: "900.000", confirmed: "0.000", reported: "0.000", outstanding: "900.000", byStatus: { PENDING: 2 } },
  verifiedTotal: "500.000", unpaidBalance: "400.000",
  allocations: { approved: "0.000", pending: "0.000", unallocatedVerified: "500.000" },
  flags: [{ code: "MIXED_PAYMENT_SYSTEMS" }, { code: "UNALLOCATED_VERIFIED_PAYMENT", amount: "500.000" }, { code: "OVERPAYMENT_RISK", excessIfScheduleFullyPaid: "500.000" }],
};
const clean: ReconRow = { ...row151, jobOrderId: 92, requestId: 152, paymentSystem: "INSTALLMENTS", legacyPayment: null, flags: [], unpaidBalance: "159.840", verifiedTotal: "728.160", quoteTotal: "888.000" };
const over: ReconRow = { ...row151, jobOrderId: 93, unpaidBalance: "-311.000", flags: [{ code: "OVER_QUOTATION_TOTAL", excess: "311.000" }] };
const report = (items: ReconRow[]): ReconReport => ({
  summary: { jobs: items.length, withFlags: items.filter((r) => r.flags.length).length, byFlag: { MIXED_PAYMENT_SYSTEMS: 1, OVERPAYMENT_RISK: 1, UNALLOCATED_VERIFIED_PAYMENT: 1, OVER_QUOTATION_TOTAL: 1 }, byPaymentSystem: { MIXED: 2, INSTALLMENTS: 1 } },
  items, total: items.length, page: 1, limit: 50, writesEnabled: false, generatedAt: "2026-10-28T10:00:00.000Z",
});
const job151: ReconJob = {
  ...row151, writesEnabled: false,
  milestones: [
    { id: 1, sequence: 1, percent: "79.00", trigger: "ON_JOB_START", status: "PENDING", amount: "711.000", currency: "SAR", hasReference: false, hasReceipt: false, allocatedApproved: "0.000", allocatedPending: "0.000", remaining: "711.000" },
    { id: 2, sequence: 2, percent: "21.00", trigger: "ON_JOB_CLOSED", status: "PENDING", amount: "189.000", currency: "SAR", hasReference: false, hasReceipt: false, allocatedApproved: "0.000", allocatedPending: "0.000", remaining: "189.000" },
  ],
  ledger: [],
  preview: { executable: false, applied: false, reason: null, remainingSource: "0.000", items: [{ milestoneId: 1, sequence: 1, amount: "500.000", milestoneRemainingAfter: "211.000", partial: true }] },
};

async function render(lng: "en" | "ar", seed: (qc: QueryClient) => void, ui: React.ReactElement, route: string, path: string) {
  const i = createInstance();
  await i.use(initReactI18next).init({
    lng, fallbackLng: "en", ns: ["finance", "payments", "common"], defaultNS: "common",
    resources: { en: { finance: enFinance, payments: enPayments, common: enCommon }, ar: { finance: arFinance, payments: arPayments, common: arCommon } },
    interpolation: { escapeValue: false },
  });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  seed(qc);
  return renderToStaticMarkup(
    <QueryClientProvider client={qc}>
      <I18nextProvider i18n={i}><MemoryRouter initialEntries={[route]}><Routes><Route path={path} element={ui} /></Routes></MemoryRouter></I18nextProvider>
    </QueryClientProvider>,
  );
}
const list = (lng: "en" | "ar", items: ReconRow[], route = "/finance/reconciliation") =>
  render(lng, (qc) => qc.setQueryData(["reconciliation", route.includes("flag=") ? new URLSearchParams(route.split("?")[1]).get("flag") : "", "", 1], report(items)), <Reconciliation />, route, "/finance/reconciliation");
const detail = (lng: "en" | "ar", j: ReconJob) =>
  render(lng, (qc) => qc.setQueryData(["reconciliation-job", "91"], j), <ReconciliationJob />, "/finance/reconciliation/91", "/finance/reconciliation/:id");

// words that would mean a write action
const WRITE_WORDS = /(apply|execute|allocate now|approve|reverse|confirm|settle)/i;
const AR_WRITE = /(تطبيق|نفّذ|اعتماد|تأكيد التوزيع|تسوية الآن)/;

describe("Reconciliation report (Super Admin, read-only)", () => {
  it("lists the findings of a request-#151-like job with clear numbers", async () => {
    const html = await list("en", [row151, clean]);
    expect(html).toContain('data-testid="read-only-note"');
    expect(html).toContain("Read-only. Nothing on this page changes a payment");
    expect(html.split('data-testid="recon-row"').length - 1).toBe(2);
    expect(html).toContain("Mixed payment systems");
    expect(html).toContain("Verified payment not allocated");
    expect(html).toContain("Overpayment risk");
    expect(html).toContain("900.000 SAR");
    expect(html).toContain("500.000 SAR");
    expect(html).toContain("Confirmed by provider");
    expect(html).toContain("confirmed 0.000 · open 900.000");
    expect(html).toContain('href="/finance/reconciliation/91"');
    expect(html).toContain("Station A");
    expect(html).toContain("Provider P");
  });
  it("flags overpaid jobs with the excess", async () => {
    const html = await list("en", [over]);
    expect(html).toContain("overpaid by 311.000");
    expect(html).toContain("Verified money exceeds the quotation");
  });
  it("has no write control of any kind — only filter and paging buttons", async () => {
    const html = await list("en", [row151, clean, over]);
    const buttons = [...html.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)].map((m) => m[1].replace(/<[^>]+>/g, " "));
    expect(buttons.length).toBeGreaterThan(0);
    for (const b of buttons) expect(b).not.toMatch(WRITE_WORDS);
    expect(html).not.toContain("<form");
    expect(html).not.toContain("<input");
  });
  it("never shows banking details (only whether they exist)", async () => {
    const html = await list("en", [row151]);
    expect(html).not.toMatch(/referenceNumber|receiptFileUrl|TRF-|https?:\/\/files/i);
  });
  it("shows an empty state", async () => {
    const html = await list("en", []);
    expect(html).toContain('data-testid="recon-empty"');
  });
  it("renders in Arabic", async () => {
    const html = await list("ar", [row151, over]);
    expect(html).toContain("مطابقة الدفعات");
    expect(html).toContain("للقراءة فقط");
    expect(html).toContain("نظامان للدفع معًا");
    expect(html).toContain("أكدها المزوّد");
    expect(html).toContain("زيادة في الدفع بمقدار 311.000");
    expect(html).not.toContain("Mixed payment systems");
    const buttons = [...html.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)].map((m) => m[1].replace(/<[^>]+>/g, " "));
    for (const b of buttons) expect(b).not.toMatch(AR_WRITE);
  });
});

describe("Reconciliation job detail", () => {
  it("shows findings, installments with remaining balance and a PREVIEW that is not applicable", async () => {
    const html = await detail("en", job151);
    expect(html).toContain("Job order #91");
    expect(html).toContain("Request #151");
    expect(html).toContain("A payment confirmed by the provider is not yet accounted against any installment (500.000).");
    expect(html).toContain("exceed the quotation by 500.000");
    expect(html.split('data-testid="recon-milestone"').length - 1).toBe(2);
    expect(html).toContain("711.000");
    expect(html).toContain("Preview only. Nothing is applied");
    expect(html).toContain("Allocate 500.000 SAR to installment #1 (partial); 211.000 SAR would remain on it.");
    expect(html).toContain("Allocation is disabled on this server.");
    expect(html).toContain("No allocation has been recorded");
    expect(html).toContain("Currency of the standalone payment is not recorded");
  });
  it("has no button, form or input — the preview cannot be executed", async () => {
    const html = await detail("en", job151);
    expect(html).not.toContain("<button");
    expect(html).not.toContain("<form");
    expect(html).not.toContain("<input");
    expect(html).toContain('href="/finance/reconciliation"'); // only navigation
  });
  it("explains why nothing can be proposed", async () => {
    const html = await detail("en", { ...job151, preview: { ...job151.preview, items: [], reason: "NO_INSTALLMENTS" } });
    expect(html).toContain("This job has no installments to allocate to.");
  });
  it("shows the append-only history when there is one", async () => {
    const html = await detail("en", { ...job151, ledger: [{ id: 5, milestoneId: 1, amount: "300.000", currency: "SAR", state: "APPROVED", reason: "Match the transfer", proposedByUserId: 1, proposedAt: "2026-10-28T09:00:00.000Z", decidedByUserId: 2, decidedAt: "2026-10-28T09:30:00.000Z", decisionReason: null, reversedByUserId: null, reversedAt: null, reversalReason: null }] });
    expect(html).toContain("300.000 SAR");
    expect(html).toContain("Approved");
    expect(html).toContain("Match the transfer");
  });
  it("renders in Arabic", async () => {
    const html = await detail("ar", job151);
    expect(html).toContain("أمر العمل رقم 91");
    expect(html).toContain("معاينة فقط");
    expect(html).toContain("التوزيع المقترح");
    expect(html).toContain("جزئي");
    expect(html).toContain("التوزيع معطَّل على هذا الخادم.");
    expect(html).not.toContain("<button");
  });
});

describe("access", () => {
  it("only the Super Admin tenant with the read permission opens the reconciliation pages", () => {
    for (const p of ["/finance/reconciliation", "/finance/reconciliation/91"]) {
      expect(canAccessPath(p, "SUPER_ADMIN", ["finance.reconciliation.read"])).toBe(true);
      expect(canAccessPath(p, "SUPER_ADMIN", ["organizations.read"])).toBe(false);
      for (const org of ["FUEL_STATION", "SERVICE_PROVIDER", "AUTHORITY"] as const) {
        expect(canAccessPath(p, org, ["finance.reconciliation.read", "payments.read"])).toBe(false);
        expect(canAccessPath(p, org, [])).toBe(false);
      }
    }
  });
});
