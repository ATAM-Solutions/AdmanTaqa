import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import enExec from "@/i18n/locales/en/execution.json";
import arExec from "@/i18n/locales/ar/execution.json";
import { ManualCheckinFormBody } from "./ManualCheckinOnBehalf";
import source from "./ManualCheckinOnBehalf.tsx?raw";

vi.mock("@/i18n/config", async () => {
  const { createInstance } = await import("i18next");
  const i = createInstance();
  await i.init({ lng: "en", resources: { en: {} }, interpolation: { escapeValue: false } });
  return { default: i, isRtl: () => false };
});
vi.mock("@/api/config", () => ({ default: {} }));

async function render(lng: "en" | "ar", over: Partial<Parameters<typeof ManualCheckinFormBody>[0]> = {}) {
  const i = createInstance();
  await i.use(initReactI18next).init({ lng, fallbackLng: "en", ns: ["execution"], defaultNS: "execution", resources: { en: { execution: enExec }, ar: { execution: arExec } }, interpolation: { escapeValue: false } });
  const props = { jobOrderId: 94, visit: { id: 67, visitDate: "2026-11-03" }, operators: [{ id: 21, name: "فني مزود خدمة" }], operatorId: "21", onOperatorChange: () => undefined, reason: "", onReasonChange: () => undefined, confirmed: false, onConfirmedChange: () => undefined, ...over };
  return renderToStaticMarkup(<I18nextProvider i18n={i}><div dir={lng === "ar" ? "rtl" : "ltr"}><ManualCheckinFormBody {...props} /></div></I18nextProvider>);
}

describe.each(["en", "ar"] as const)("manual check-in dialog body (%s)", (lng) => {
  const L = (lng === "en" ? enExec : arExec) as unknown as { manual: Record<string, string> };
  it("shows the job, the visit and the operator being confirmed, a required reason and an explicit confirmation naming the operator", async () => {
    const html = await render(lng);
    expect(html).toContain('data-testid="manual-checkin-summary"');
    expect(html).toContain("#94"); expect(html).toContain("#67"); expect(html).toContain("2026-11-03"); expect(html).toContain("فني مزود خدمة");
    expect(html).toContain(L.manual.job); expect(html).toContain(L.manual.visit); expect(html).toContain(L.manual.operator); expect(html).toContain(L.manual.reason);
    expect(html).toContain('data-testid="manual-checkin-reason"'); expect(html).toContain('data-testid="manual-checkin-confirm"');
    expect(html).toContain(L.manual.confirm.replace("{{name}}", "فني مزود خدمة"));
    expect(html).toContain(L.manual.notice);
    expect(html).not.toMatch(/\{\{|manual\.[a-z]/);
  });
  it("shows the reason hint only for a non-empty reason that is too short", async () => {
    expect(await render(lng, { reason: "" })).not.toContain('data-testid="manual-reason-hint"');
    expect(await render(lng, { reason: "ab" })).toContain('data-testid="manual-reason-hint"');
    expect(await render(lng, { reason: "no signal" })).not.toContain('data-testid="manual-reason-hint"');
  });
  it("offers a choice only when several operators are assigned, and never invents one", async () => {
    expect(await render(lng)).not.toContain('data-testid="manual-checkin-operator"');
    const html = await render(lng, { operators: [{ id: 21, name: "A" }, { id: 22, name: "B" }], operatorId: "22" });
    expect(html).toContain('data-testid="manual-checkin-operator"');
  });
});

describe("safety of the component", () => {
  it("never sends coordinates, and always sends the job and the operator it displayed", () => {
    expect(source).toMatch(/method: "MANUAL"/);
    expect(source).toMatch(/onBehalfOfOperatorId: operator\.id/);
    expect(source).toMatch(/jobOrderId: Number\(jobOrderId\)/);
    expect(source).not.toMatch(/\blat\b|\blng\b|latitude|longitude|geolocation/i);
  });
  it("uses logical (RTL-safe) classes only", () => {
    expect(source).not.toMatch(/\b(?:pl|pr|ml|mr)-\d|\btext-(?:left|right)\b|\b(?:left|right)-\d/);
  });
});
