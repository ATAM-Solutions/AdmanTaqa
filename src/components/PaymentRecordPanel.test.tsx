import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import en from "@/i18n/locales/en/paymentRecord.json";
import ar from "@/i18n/locales/ar/paymentRecord.json";

vi.mock("@/i18n/config", async () => {
  const { createInstance } = await import("i18next");
  const i = createInstance();
  await i.init({ lng: "en", resources: { en: {} }, interpolation: { escapeValue: false } });
  return { default: i, isRtl: () => false };
});

import PaymentRecordPanel from "./PaymentRecordPanel";

async function render(lng: "en" | "ar", ui: React.ReactElement) {
  const i = createInstance();
  await i.use(initReactI18next).init({ lng, fallbackLng: "en", ns: ["paymentRecord"], defaultNS: "paymentRecord", resources: { en: { paymentRecord: en }, ar: { paymentRecord: ar } }, interpolation: { escapeValue: false } });
  return renderToStaticMarkup(<I18nextProvider i18n={i}>{ui}</I18nextProvider>);
}
const sent = { status: "STATION_CONFIRMED_SENT", method: "BANK_TRANSFER", referenceNumber: "TRF-9", amount: 100, stationConfirmedAt: "2026-10-25T10:00:00Z", receiptFileUrl: "https://x.test/r.pdf" };

describe("payment record panel", () => {
  it("station: a reported payment is 'awaiting the provider', never 'received'", async () => {
    const html = await render("en", <PaymentRecordPanel record={sent} audience="station" />);
    expect(html).toContain('data-status="SENT"');
    expect(html).toContain("awaiting the provider");
    expect(html).toContain("Do not send this payment again");
    expect(html).toContain("TRF-9");
    expect(html).toContain("Open the transfer receipt");
    expect(html).not.toContain("confirmed received by the provider");
    expect(html).not.toContain("payment-confirm-received");
  });
  it("provider: sees the details and a confirm button only when allowed to act", async () => {
    const withAction = await render("en", <PaymentRecordPanel record={sent} audience="provider" onConfirm={() => undefined} />);
    expect(withAction).toContain("payment-confirm-received");
    expect(withAction).toContain("Confirm receipt");
    expect(withAction).not.toContain("provider.SENT");
    const viewOnly = await render("en", <PaymentRecordPanel record={sent} audience="provider" />);
    expect(viewOnly).not.toContain("payment-confirm-received");
  });
  it("after the provider confirmed there is no action and the state says so", async () => {
    const html = await render("en", <PaymentRecordPanel record={{ ...sent, status: "PROVIDER_CONFIRMED_RECEIVED", providerConfirmedAt: "2026-10-25T12:00:00Z" }} audience="provider" onConfirm={() => undefined} />);
    expect(html).toContain('data-status="RECEIVED"');
    expect(html).not.toContain("payment-confirm-received");
  });
  it("Arabic: translated, no raw keys", async () => {
    const html = await render("ar", <PaymentRecordPanel record={sent} audience="provider" onConfirm={() => undefined} />);
    expect(html).toContain("تأكيد الاستلام");
    expect(html).not.toMatch(/provider\.|fields\./);
  });
  it("English and Arabic define the same keys", () => {
    const keys = (o: unknown, p = ""): string[] => Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
    expect(keys(ar).sort()).toEqual(keys(en).sort());
  });
});
