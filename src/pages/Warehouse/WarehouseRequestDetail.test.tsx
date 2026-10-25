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
let me = { id: 9, perms: ["warehouse.read"] as string[] };
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { id: me.id }, hasPermission: (p: string) => me.perms.includes(p), organization: { id: 1, type: "FUEL_STATION" }, permissions: me.perms }),
}));

import WarehouseRequestDetail from "./WarehouseRequestDetail";

const action = (allowed: boolean, reason: string | null, actor: string, legacy = false) => ({ allowed, reason, actor, legacy });
/** What the server's workflow descriptor says for the two roles at a given status. */
const raw = (status: string, who: "WM" | "TECH" | "MM", over: Record<string, unknown> = {}) => {
  const wm = who === "WM";
  const issuable = ["MAINTENANCE_APPROVED", "UNDER_REVIEW", "APPROVED"].includes(status);
  return {
    id: 5, status, notes: null, createdAt: "2026-10-25T08:00:00.000Z", requestedByUserId: 7, internalTaskId: null, rejectionReason: null,
    approvedAt: "2026-10-25T09:00:00.000Z", issuedAt: ["ISSUED", "DELIVERED"].includes(status) ? "2026-10-25T09:05:00.000Z" : null,
    receivedAt: status === "DELIVERED" ? "2026-10-25T09:30:00.000Z" : null,
    WarehouseManager: { fullName: "Wael" }, ReceivedByUser: status === "DELIVERED" ? { fullName: "Tariq" } : null,
    RequestedByUser: { fullName: "Tariq" }, Branch: { nameEn: "North", nameAr: "الشمال" }, Warehouse: { id: 1, name: "Main" }, WarehouseOrderUpdates: [],
    WarehouseOrderItems: [
      { id: 1, partName: "Oil filter", quantity: 4, approvedQuantity: issuable ? null : 4, issuedQuantity: issuable ? null : 4, receivedQuantity: status === "DELIVERED" ? 4 : null,
        pendingReceiptQuantity: status === "ISSUED" ? 4 : 0, usedQuantity: status === "DELIVERED" ? 4 : null, availableQuantity: wm ? 3 : null, sparePartId: 11,
        status: issuable ? "REQUESTED" : status === "ISSUED" ? "ISSUED" : "DELIVERED" },
    ],
    workflow: {
      status, phase: status === "ISSUED" ? "AWAITING_TECHNICIAN_RECEIPT" : status === "DELIVERED" ? "RECEIVED" : null, terminal: false,
      nextStep: { actor: status === "ISSUED" ? "TECHNICIAN" : "WAREHOUSE_MANAGER", action: status === "ISSUED" ? "receive" : "approveAndIssue" },
      warehouseAssigned: true, itemCount: 1, unmappedItemIds: [],
      actions: {
        approveAndIssue: wm ? action(issuable, issuable ? null : "WRONG_STATE", "WAREHOUSE_MANAGER") : action(false, "MISSING_PERMISSION", "WAREHOUSE_MANAGER"),
        receive: who === "TECH" ? action(status === "ISSUED", status === "ISSUED" ? null : "WRONG_STATE", "TECHNICIAN") : action(false, "NOT_ASSIGNED_TECHNICIAN", "TECHNICIAN"),
        review: action(false, wm ? "WRONG_STATE" : "MISSING_PERMISSION", "WAREHOUSE_MANAGER", true),
        approve: action(wm && status === "UNDER_REVIEW", "WRONG_STATE", "WAREHOUSE_MANAGER", true),
        issue: action(wm && status === "APPROVED", "WRONG_STATE", "WAREHOUSE_MANAGER", true),
        deliver: action(false, "MISSING_PERMISSION", "TECHNICIAN", true),
        reject: action(wm && issuable, "WRONG_STATE", "WAREHOUSE_MANAGER"),
      },
    },
    ...over,
  };
};

async function render(order: unknown, lng: "en" | "ar", who = me) {
  me = who;
  const i = createInstance();
  await i.use(initReactI18next).init({
    lng, fallbackLng: "en", ns: ["warehouse", "common"], defaultNS: "warehouse",
    resources: { en: { warehouse: enWh, common: enCommon }, ar: { warehouse: arWh, common: arCommon } }, interpolation: { escapeValue: false },
  });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  qc.setQueryData(["warehouse-order", "5"], normalizeOrder(order));
  qc.setQueryData(["warehouses"], { items: [], meta: { isOrgWide: true, canAddItems: false, canManageWarehouses: false } });
  return renderToStaticMarkup(
    <QueryClientProvider client={qc}><I18nextProvider i18n={i}><MemoryRouter initialEntries={["/warehouse-requests/5"]}>
      <Routes><Route path="/warehouse-requests/:id" element={<div dir={lng === "ar" ? "rtl" : "ltr"}><WarehouseRequestDetail /></div>} /></Routes>
    </MemoryRouter></I18nextProvider></QueryClientProvider>,
  );
}

const WM = { id: 3, perms: ["warehouse.read"] };
const TECH = { id: 7, perms: [] };
const OLD_BUTTONS = ['data-testid="action-review"', 'data-testid="action-approve"', 'data-testid="action-issue"', 'data-testid="action-deliver"', 'data-testid="approve-panel"', 'data-testid="issue-panel"'];

describe("warehouse request — two-step workflow", () => {
  it("Warehouse Manager sees Approve & Issue Parts after Maintenance Manager approval, with stock and no obsolete buttons (English)", async () => {
    const html = await render(raw("MAINTENANCE_APPROVED", "WM"), "en", WM);
    expect(html).toContain('data-testid="action-approveAndIssue"');
    expect(html).toContain("Approve &amp; Issue Parts");
    expect(html).toContain("in stock 3");
    expect(html).not.toContain('data-testid="action-receive"');
    for (const s of OLD_BUTTONS) expect(html, s).not.toContain(s);
    expect(html).not.toContain("Start warehouse review");
    expect(html).not.toContain("Confirm delivery");
    // 4 requested, only 3 in stock, default quantity is the full 4 -> a clear validation message, button disabled
    expect(html).toContain('data-testid="issue-short"');
    expect(html).toContain("Only 3 in stock");
    expect(html).toMatch(/data-testid="action-approveAndIssue"[^>]*disabled|disabled[^>]*data-testid="action-approveAndIssue"/);
  });

  it("the same screen in Arabic uses the approved wording and RTL", async () => {
    const html = await render(raw("MAINTENANCE_APPROVED", "WM"), "ar", WM);
    expect(html).toContain("اعتماد وصرف القطع");
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("المتوفر في المخزون 3 فقط");
    expect(html).not.toContain("تأكيد الاستلام");
    for (const s of OLD_BUTTONS) expect(html, s).not.toContain(s);
  });

  it("a request already partway through the old flow (under review) still gets the single combined step", async () => {
    const html = await render(raw("UNDER_REVIEW", "WM"), "en", WM);
    expect(html).toContain('data-testid="action-approveAndIssue"');
    expect(html).not.toContain('data-testid="action-approve"');
  });

  it("the assigned technician sees Confirm Receipt with issued quantities; the manager does not (EN + AR)", async () => {
    const tech = await render(raw("ISSUED", "TECH"), "en", TECH);
    expect(tech).toContain('data-testid="action-receive"');
    expect(tech).toContain("Confirm Receipt");
    expect(tech).toContain("issued 4");
    expect(tech).toContain("Awaiting technician receipt");
    expect(tech).not.toContain('data-testid="action-approveAndIssue"');
    const techAr = await render(raw("ISSUED", "TECH"), "ar", TECH);
    expect(techAr).toContain("تأكيد الاستلام");
    expect(techAr).toContain("بانتظار استلام الفني");
    const mgr = await render(raw("ISSUED", "WM"), "en", WM);
    expect(mgr).not.toContain('data-testid="action-receive"');
    expect(mgr).toContain("the technician — Confirm Receipt"); // informational next step, not a button
    expect(mgr).toContain("Awaiting technician receipt");
    expect(mgr).toContain("4 awaiting receipt");
  });

  it("after receipt it shows issued and received quantities, who and when, and no workflow buttons", async () => {
    const html = await render(raw("DELIVERED", "TECH"), "en", TECH);
    expect(html).toContain("Received by technician");
    expect(html).toContain('data-testid="order-issued"');
    expect(html).toContain('data-testid="order-received"');
    expect(html).toContain("Tariq");
    expect(html).not.toContain('data-testid="action-receive"');
    expect(html).not.toContain('data-testid="action-approveAndIssue"');
  });

  it("a free-text line tells the manager why the combined step is unavailable", async () => {
    const o = raw("MAINTENANCE_APPROVED", "WM");
    (o.workflow.actions.approveAndIssue as { allowed: boolean; reason: string | null }) = { allowed: false, reason: "ITEM_NOT_MAPPED", actor: "WAREHOUSE_MANAGER" } as never;
    const html = await render(o, "en", WM);
    expect(html).toContain('data-testid="why-approveAndIssue"');
    expect(html).not.toContain('data-testid="action-approveAndIssue"');
  });
});
