import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import enWarehouse from "@/i18n/locales/en/warehouse.json";
import arWarehouse from "@/i18n/locales/ar/warehouse.json";
import type { AssignmentPolicy } from "@/api/services/warehouseAdminService";

vi.mock("@/i18n/config", async () => {
  const { createInstance } = await import("i18next");
  const i = createInstance();
  await i.init({ lng: "en", resources: { en: {} }, interpolation: { escapeValue: false } });
  return { default: i, isRtl: () => false };
});
vi.mock("@/api/config", () => ({ default: {} }));

import AssignmentPolicyCard from "./AssignmentPolicyCard";

async function render(policy: AssignmentPolicy, isAdmin: boolean, lng: "en" | "ar") {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({ lng, fallbackLng: "en", ns: ["warehouse"], defaultNS: "warehouse", resources: { en: { warehouse: enWarehouse }, ar: { warehouse: arWarehouse } }, interpolation: { escapeValue: false } });
  const qc = new QueryClient();
  qc.setQueryData(["warehouse-assignment-policy"], policy);
  return renderToStaticMarkup(
    <QueryClientProvider client={qc}><I18nextProvider i18n={i18n}><div dir={lng === "ar" ? "rtl" : "ltr"}><AssignmentPolicyCard isAdmin={isAdmin} /></div></I18nextProvider></QueryClientProvider>,
  );
}
const impact = (over = {}) => ({
  enabled: false, warehouses: 2, managers: 3, managersWithAssignment: 1,
  managersWithoutAssignment: [{ userId: 1, fullName: "Omar", email: null }, { userId: 2, fullName: "Sara", email: null }],
  warehousesWithoutManager: [{ id: 5, name: "Main" }], openOrdersInWarehousesWithoutManager: 0, blockers: [] as string[], canActivate: true, requiresConfirmation: true, ...over,
});
const tag = (html: string, id: string) => html.match(new RegExp(`<button[^>]*data-testid="${id}"[^>]*>`))?.[0] ?? null;
const off = (t: string | null) => t != null && /\sdisabled=""/.test(t);

describe("manager assignment switch", () => {
  it("administrator: sees who would lose access and cannot turn it on until the impact is confirmed", async () => {
    const html = await render({ enabled: false, impact: impact() }, true, "en");
    expect(html).toContain('data-testid="policy-impact"');
    expect(html).toContain("2 people would lose access to every warehouse");
    expect(html).toContain("Omar");
    expect(html).toContain('data-testid="policy-confirm"');
    expect(off(tag(html, "policy-on"))).toBe(true);
  });

  it("when nobody is assigned anywhere the switch stays disabled and says why", async () => {
    const html = await render({ enabled: false, impact: impact({ canActivate: false, blockers: ["NO_MANAGERS_ASSIGNED"], managersWithAssignment: 0 }) }, true, "en");
    expect(off(tag(html, "policy-on"))).toBe(true);
    expect(html).toContain("Assign at least one manager to a warehouse before turning this on.");
  });

  it("nothing to confirm: the switch is available at once", async () => {
    const html = await render({ enabled: false, impact: impact({ managersWithoutAssignment: [], warehousesWithoutManager: [], requiresConfirmation: false }) }, true, "en");
    expect(html).not.toContain('data-testid="policy-confirm"');
    expect(off(tag(html, "policy-on"))).toBe(false);
  });

  it("a non-administrator only sees the state, never the impact or a switch", async () => {
    const html = await render({ enabled: true, impact: null }, false, "en");
    expect(html).toContain('data-testid="policy-state"');
    expect(html).not.toContain('data-testid="policy-impact"');
    expect(html).not.toContain('data-testid="policy-on"');
    expect(html).not.toContain('data-testid="policy-off"');
    expect(html).toContain("Only the company administrator can change this.");
  });

  it("administrator with scoping on can turn it off", async () => {
    const html = await render({ enabled: true, impact: impact({ enabled: true }) }, true, "en");
    expect(tag(html, "policy-off")).not.toBeNull();
  });

  it("Arabic: translated, right-to-left, with the Arabic plural for two people", async () => {
    const html = await render({ enabled: false, impact: impact() }, true, "ar");
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("إسناد المديرين");
    expect(html).toContain("سيفقد شخصان الوصول إلى جميع المستودعات");
    expect(html).toContain("تفعيل");
  });
});
