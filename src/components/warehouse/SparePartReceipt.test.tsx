import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import enWh from "@/i18n/locales/en/warehouse.json";
import arWh from "@/i18n/locales/ar/warehouse.json";
import enCommon from "@/i18n/locales/en/common.json";
import arCommon from "@/i18n/locales/ar/common.json";

const patch = vi.fn().mockResolvedValue({ data: {} });
vi.mock("@/api/config", () => ({ default: { patch: (...a: unknown[]) => patch(...a), get: vi.fn(), put: vi.fn(), post: vi.fn() } }));
vi.mock("@/i18n/config", async () => {
  const { createInstance } = await import("i18next");
  const i = createInstance();
  await i.init({ lng: "en", resources: { en: {} }, interpolation: { escapeValue: false } });
  return { default: i, isRtl: () => false };
});

import SparePartRequestsPanel from "./SparePartRequestsPanel";
import { normalizeOrder, runOrderAction } from "@/api/services/warehouseService";

const entry = (phase: string, status: string, over: Record<string, unknown> = {}) => ({
  requestId: 72, warehouseOrderId: 72, taskId: 95, internalWorkOrderId: 76, requestedBy: { id: 7, fullName: "Tech" }, requestedAt: "2026-11-11T10:00:00.000Z",
  items: [{ id: 1, partName: "Oil filter", quantity: 3, approvedQuantity: 3, issuedQuantity: 3, receivedQuantity: null, returnedQuantity: null }],
  status, phase, statusLabel: { en: "Issued", ar: "تم الصرف" },
  maintenanceApproval: { decision: "APPROVED", by: { id: 2, fullName: "MM" }, at: "2026-11-11T10:05:00.000Z" },
  warehouse: { id: 11, name: "Main Warehouse" }, nextAction: null, responsibleUsers: [], canOpenWarehouseOrder: true, timeline: [], ...over,
});
const order = (status: string, allowed: boolean) => normalizeOrder({
  id: 72, status, notes: null, createdAt: "2026-11-11T10:00:00.000Z", requestedByUserId: 7, assignedTechnicianId: 7, internalTaskId: 95, rejectionReason: null,
  approvedAt: null, issuedAt: "2026-11-11T11:00:00.000Z", receivedAt: null, RequestedByUser: { fullName: "Tech" }, Warehouse: { id: 11, name: "Main Warehouse" }, WarehouseOrderUpdates: [],
  WarehouseOrderItems: [{ id: 1, partName: "Oil filter", quantity: 3, approvedQuantity: 3, issuedQuantity: 3, receivedQuantity: null, pendingReceiptQuantity: 0, usedQuantity: null, returnedQuantity: 0, pendingReturnQuantity: 0, status: status === "ISSUED" ? "ISSUED" : "DELIVERED" }],
  workflow: { status, phase: status === "ISSUED" ? "AWAITING_TECHNICIAN_RECEIPT" : "RECEIVED", terminal: false, nextStep: null, warehouseAssigned: true, itemCount: 1, unmappedItemIds: [], actions: { receive: { allowed, reason: allowed ? null : "WRONG_STATE" } } },
});

async function render(requests: unknown[], ord: unknown, lng: "en" | "ar") {
  const i = createInstance();
  await i.use(initReactI18next).init({ lng, fallbackLng: "en", ns: ["warehouse", "common"], defaultNS: "warehouse",
    resources: { en: { warehouse: enWh, common: enCommon }, ar: { warehouse: arWh, common: arCommon } }, interpolation: { escapeValue: false } });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  qc.setQueryData(["spare-part-requests", "task", 95], requests);
  qc.setQueryData(["warehouse-order", "72"], ord);
  return renderToStaticMarkup(<QueryClientProvider client={qc}><I18nextProvider i18n={i}><MemoryRouter><SparePartRequestsPanel root="task" id={95} /></MemoryRouter></I18nextProvider></QueryClientProvider>);
}

describe.each(["en", "ar"] as const)("receipt inside the task's spare-parts panel (%s)", (lng) => {
  const wh = lng === "en" ? enWh : arWh;
  it("the assigned technician sees the order, warehouse, issued quantity, status and the receipt form prefilled with the issued amount", async () => {
    const html = await render([entry("AWAITING_RECEIPT", "ISSUED")], order("ISSUED", true), lng);
    expect(html).toContain("Main Warehouse"); expect(html).toContain("Oil filter");
    expect(html).toContain(lng === "en" ? "Issued" : "تم الصرف");
    expect(html).toContain('data-testid="receive-panel"');
    expect(html).toContain(wh.receive.title);
    expect(html).toMatch(/data-testid="receive-qty"[^>]*value="3"|value="3"[^>]*data-testid="receive-qty"/);
    expect(html).toContain('data-testid="action-receive"'); expect(html).toContain(wh.actions.receive);
    expect(html).not.toContain('data-testid="receive-note-box"');          // full receipt needs no note
  });
  it("no form when the server does not allow receipt for this caller (other user, manager, read-only)", async () => {
    const html = await render([entry("AWAITING_RECEIPT", "ISSUED")], order("ISSUED", false), lng);
    expect(html).not.toContain('data-testid="receive-panel"'); expect(html).toContain("Oil filter");
  });
  it("no form once the parts were received, or while the request is not issued yet", async () => {
    expect(await render([entry("RECEIVED", "DELIVERED")], order("DELIVERED", true), lng)).not.toContain('data-testid="receive-panel"');
    expect(await render([entry("AWAITING_WAREHOUSE", "MAINTENANCE_APPROVED")], order("ISSUED", true), lng)).not.toContain('data-testid="receive-panel"');
  });
  it("no form when the caller may not open the order", async () => {
    expect(await render([entry("AWAITING_RECEIPT", "ISSUED", { canOpenWarehouseOrder: false })], order("ISSUED", true), lng)).not.toContain('data-testid="receive-panel"');
  });
  it("Arabic strings exist for the receipt success message", () => {
    expect((wh.receive as Record<string, string>).success).toBeTruthy();
  });
});

describe("the receipt request is the same one the warehouse request page sends", () => {
  beforeEach(() => patch.mockClear());
  it("full receipt sends an empty body; a partial receipt sends the received quantities and the note", async () => {
    await runOrderAction(72, { kind: "receive" });
    expect(patch).toHaveBeenLastCalledWith("warehouse-orders/72/receive", {});
    await runOrderAction(72, { kind: "receive", received: [{ itemId: 1, quantity: 2 }], note: "one damaged" });
    expect(patch).toHaveBeenLastCalledWith("warehouse-orders/72/receive", { itemReceivedQuantities: [{ itemId: 1, quantity: 2 }], note: "one damaged" });
  });
});
