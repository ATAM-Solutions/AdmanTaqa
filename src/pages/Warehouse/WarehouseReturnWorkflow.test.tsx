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

const raw = (status: string, over: Record<string, unknown> = {}, item: Record<string, unknown> = {}, actions: Record<string, unknown> = {}) => ({
  id: 5, status, notes: null, createdAt: "2026-10-25T08:00:00.000Z", requestedByUserId: 7, assignedTechnicianId: 7, internalTaskId: null, rejectionReason: null,
  approvedAt: null, issuedAt: "2026-10-25T09:05:00.000Z", receivedAt: "2026-10-25T09:30:00.000Z",
  RequestedByUser: { fullName: "Tariq" }, Branch: { nameEn: "North", nameAr: "الشمال" }, Warehouse: { id: 1, name: "Main" }, WarehouseOrderUpdates: [],
  WarehouseOrderItems: [{ id: 1, partName: "Oil filter", quantity: 4, approvedQuantity: 4, issuedQuantity: 4, receivedQuantity: 4, pendingReceiptQuantity: 0, usedQuantity: null, status: "DELIVERED", ...item }],
  workflow: { status, phase: "RECEIVED", terminal: false, nextStep: null, warehouseAssigned: true, itemCount: 1, unmappedItemIds: [], actions },
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


const A = { submitReturn: { allowed: true, reason: null }, confirmReturn: { allowed: true, reason: null } };
const USED = { usedQuantity: 1, usageConfirmedAt: "2026-10-26T10:00:00.000Z", usageConfirmedByUserId: 7 };

describe.each(["en", "ar"] as const)("one return workflow and the warehouse's 'not received' answer (%s)", (lng) => {
  const wh = lng === "en" ? enWh : arWh;
  it("the assigned technician returns parts only from the reconciliation card — no second return form (finding #3)", async () => {
    for (const status of ["DELIVERED", "PARTIAL_RETURN"]) {
      const html = await render(raw(status, {}, USED, A), lng);
      expect(html, status).toContain('data-testid="usage-panel"');
      expect(html, status).not.toContain('data-testid="return-form"');
      expect(html, status).not.toContain('data-testid="record-return"');
      expect(html, status).not.toContain('data-testid="action-submitReturn"');
    }
  });
  it("a requester who is NOT the assigned technician keeps the old return form (nothing else changes for them)", async () => {
    const html = await render(raw("DELIVERED", { assignedTechnicianId: 99 }, USED, A), lng);
    expect(html).toContain('data-testid="return-form"');
  });
  it("the warehouse manager sees a clear 'not received' action with a required reason, not 'reason for re-return' (finding #4)", async () => {
    const html = await render(raw("RETURN_SUBMITTED", { requestedByUserId: 3, assignedTechnicianId: 3 }, USED, A), lng, { id: 9, perms: ["warehouse_orders.close", "warehouse_orders.read"] });
    expect(html).toContain('data-testid="reject-return-panel"');
    expect(html).toContain(wh.actions.rejectReturn);
    expect(html).toContain(wh.return.rejectReason);
    expect(html).toContain(wh.return.rejectHint);
    expect(html).not.toContain(lng === "ar" ? "سبب إعادة الإرجاع" : "Reason for sending the return back");
    expect(html).toMatch(/data-testid="action-rejectReturn"[^>]*disabled|disabled=""[^>]*data-testid="action-rejectReturn"/);   // no reason => cannot press
  });
  it("the technician sees the warehouse's reason on the order", async () => {
    const html = await render(raw("PARTIAL_RETURN", { returnRejection: { reason: "القطع تالفة", at: "2026-10-26T11:00:00.000Z", by: { fullName: "Mona" } } }, USED, A), lng);
    expect(html).toContain('data-testid="return-not-received"');
    expect(html).toContain("القطع تالفة");
    expect(html).toContain(wh.return.notReceivedTitle);
    expect(await render(raw("PARTIAL_RETURN", { returnRejection: null }, USED, A), lng)).not.toContain('data-testid="return-not-received"');
  });
  it("system-written English defaults are not shown as the order's note or history (finding #2 note)", async () => {
    const html = await render(raw("DELIVERED", { notes: "Auto-created on WAITING_PARTS", WarehouseOrderUpdates: [{ id: 1, message: "Auto-created due to InternalTask WAITING_PARTS", newStatus: "DRAFT", CreatedByUser: { fullName: "Tariq" }, createdAt: "2026-10-25T08:00:00.000Z" }] }, USED, A), lng);
    expect(html).not.toContain("Auto-created");
  });
});
