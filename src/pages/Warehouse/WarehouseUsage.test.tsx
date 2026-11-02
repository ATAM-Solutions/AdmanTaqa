import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import enWh from "@/i18n/locales/en/warehouse.json";
import arWh from "@/i18n/locales/ar/warehouse.json";
import enCommon from "@/i18n/locales/en/common.json";
import arCommon from "@/i18n/locales/ar/common.json";
import { normalizeOrder } from "@/api/services/warehouseService";

vi.mock("@/i18n/config", async () => {
  const { createInstance } = await import("i18next");
  const i = createInstance();
  await i.init({ lng: "en", resources: { en: {} }, interpolation: { escapeValue: false } });
  return { default: i, isRtl: () => false };
});
vi.mock("@/api/config", () => ({ default: {} }));
let me = { id: 7, perms: [] as string[] };
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { id: me.id, fullName: "Tariq" }, hasPermission: (p: string) => me.perms.includes(p), organization: { id: 1, type: "FUEL_STATION" }, permissions: me.perms }),
}));

import WarehouseRequestDetail from "./WarehouseRequestDetail";

const raw = (status: string, over: Record<string, unknown> = {}, item: Record<string, unknown> = {}) => ({
  id: 5, status, notes: null, createdAt: "2026-10-25T08:00:00.000Z", requestedByUserId: 7, assignedTechnicianId: 7, internalTaskId: null, rejectionReason: null,
  approvedAt: null, issuedAt: "2026-10-25T09:05:00.000Z", receivedAt: "2026-10-25T09:30:00.000Z",
  RequestedByUser: { fullName: "Tariq" }, Branch: { nameEn: "North", nameAr: "الشمال" }, Warehouse: { id: 1, name: "Main" }, WarehouseOrderUpdates: [],
  WarehouseOrderItems: [{ id: 1, partName: "Oil filter", quantity: 4, approvedQuantity: 4, issuedQuantity: 4, receivedQuantity: 4, pendingReceiptQuantity: 0, usedQuantity: null, status: "DELIVERED", ...item }],
  workflow: { status, phase: "RECEIVED", terminal: false, nextStep: null, warehouseAssigned: true, itemCount: 1, unmappedItemIds: [], actions: {} },
  ...over,
});

async function render(order: unknown, lng: "en" | "ar", who = { id: 7, perms: [] as string[] }) {
  me = who;
  const i = createInstance();
  await i.use(initReactI18next).init({
    lng, fallbackLng: "en", ns: ["warehouse", "common"], defaultNS: "warehouse",
    resources: { en: { warehouse: enWh, common: enCommon }, ar: { warehouse: arWh, common: arCommon } }, interpolation: { escapeValue: false },
  });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  qc.setQueryData(["warehouse-order", "5"], normalizeOrder(order));
  return renderToStaticMarkup(
    <QueryClientProvider client={qc}><I18nextProvider i18n={i}><MemoryRouter initialEntries={["/warehouse-requests/5"]}>
      <Routes><Route path="/warehouse-requests/:id" element={<WarehouseRequestDetail />} /></Routes>
    </MemoryRouter></I18nextProvider></QueryClientProvider>,
  );
}

describe.each(["en", "ar"] as const)("technician usage card (%s)", (lng) => {
  it("shows for the assigned technician once the parts are received, with no silent default", async () => {
    const html = await render(raw("DELIVERED"), lng);
    expect(html).toContain('data-testid="usage-panel"');
    expect(html).toContain('data-testid="save-usage"');
    expect(html).toMatch(/data-testid="usage-qty"/);
    expect(html).not.toMatch(/value="4"[^>]*data-testid="usage-qty"/);
    expect(html).toMatch(/<button[^>]*\sdisabled=""[^>]*data-testid="save-usage"|<button[^>]*data-testid="save-usage"[^>]*\sdisabled=""/);
    expect(await render(raw("PARTIAL_RETURN"), lng)).toContain('data-testid="usage-panel"');
  });
  it("is hidden for other users and before receipt", async () => {
    expect(await render(raw("DELIVERED"), lng, { id: 3, perms: ["warehouse.read"] })).not.toContain('data-testid="usage-panel"');
    expect(await render(raw("ISSUED"), lng)).not.toContain('data-testid="usage-panel"');
  });
  it("shows who and when once usage was confirmed", async () => {
    const html = await render(raw("DELIVERED", {}, { usedQuantity: 3, usageConfirmedAt: "2026-10-26T10:00:00.000Z", usageConfirmedByUserId: 7 }), lng);
    expect(html).toContain('data-testid="usage-confirmed"');
    expect(html).toContain("Tariq");
  });
});
