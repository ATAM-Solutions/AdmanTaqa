import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import enStation from "@/i18n/locales/en/station.json";
import arStation from "@/i18n/locales/ar/station.json";

const patch = vi.fn().mockResolvedValue({ data: { data: { id: 76, status: "AWAITING_OPS_CONFIRMATION" } } });
vi.mock("@/api/config", () => ({ default: { patch: (...a: unknown[]) => patch(...a), get: vi.fn() } }));
vi.mock("@/i18n/config", async () => {
  const { createInstance } = await import("i18next");
  const i = createInstance();
  await i.init({ lng: "en", resources: { en: {} }, interpolation: { escapeValue: false } });
  return { default: i, isRtl: () => false };
});
let perms: string[] = [];
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { id: 1 }, hasPermission: (p: string) => perms.includes(p), permissions: perms }),
}));

import InternalReviewChainPanel from "./InternalReviewChainPanel";
import { warehouseReturnInternalWorkOrder } from "@/api/services/internalWorkOrderService";
import { orderActionFlags } from "@/lib/internalReviewChain";
import type { InternalWorkOrderItem, PartsReconciliation } from "@/types/internalWorkOrder";

const MM = ["internal_work_orders.read", "internal_work_orders.review", "internal_tasks.review", "internal_work_orders.warehouse_return"];
const OPS = ["internal_work_orders.read", "internal_work_orders.ops_confirm", "internal_work_orders.warehouse_return"];
const resolved: PartsReconciliation = {
  hasIssuedParts: true, blocking: false, blockingLines: 0,
  totals: { issued: 4, received: 4, used: 3, returned: 1, returnPending: 0, unresolved: 0 },
  lines: [{ warehouseOrderId: 72, warehouseOrderStatus: "CLOSED", assignedTechnicianId: 7, itemId: 1, partName: "Oil filter", issued: 4, received: 4, used: 3, returned: 1, returnPending: 0, unresolved: 0, shortfall: 0, usageConfirmed: true, blockers: [] }],
};
const unresolved: PartsReconciliation = {
  ...resolved, blocking: true, blockingLines: 1, totals: { issued: 4, received: 4, used: 0, returned: 0, returnPending: 0, unresolved: 4 },
  lines: [{ ...resolved.lines[0], warehouseOrderStatus: "DELIVERED", used: null, returned: 0, unresolved: 4, usageConfirmed: false, blockers: ["USAGE_NOT_CONFIRMED"] }],
};
const v1 = (status: string, over: Partial<InternalWorkOrderItem> = {}): InternalWorkOrderItem => ({
  id: 76, title: "Pump", status: status as InternalWorkOrderItem["status"], workflowVersion: 1,
  workflow: { version: 1, legacy: true, stage: "AWAITING_WAREHOUSE_RETURN", nextActor: "MAINTENANCE_MANAGER", partsBlockingClosure: false, canFinalClose: false },
  partsReconciliation: resolved, tasks: [], ...over,
});
const v2 = (status: string): InternalWorkOrderItem => ({
  id: 77, title: "Pump", status: status as InternalWorkOrderItem["status"], workflowVersion: 2,
  workflow: { version: 2, legacy: false, stage: "AWAITING_FINAL_CLOSURE", nextActor: "MAINTENANCE_MANAGER", partsBlockingClosure: false, canFinalClose: true },
  partsReconciliation: resolved, reviewHistory: [], tasks: [],
});

async function render(lng: "en" | "ar", order: InternalWorkOrderItem, as: string[]) {
  perms = as;
  const i = createInstance();
  await i.use(initReactI18next).init({ lng, fallbackLng: "en", ns: ["station"], defaultNS: "station", resources: { en: { station: enStation }, ar: { station: arStation } }, interpolation: { escapeValue: false } });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  return renderToStaticMarkup(<QueryClientProvider client={qc}><I18nextProvider i18n={i}><MemoryRouter><div dir={lng === "ar" ? "rtl" : "ltr"}><InternalReviewChainPanel order={order} /></div></MemoryRouter></I18nextProvider></QueryClientProvider>);
}
const has = (html: string, id: string) => html.includes(`data-testid="${id}"`);
const disabled = (html: string, id: string) => new RegExp(`<button[^>]*\\sdisabled=""[^>]*data-testid="${id}"|<button[^>]*data-testid="${id}"[^>]*\\sdisabled=""`).test(html);

describe.each(["en", "ar"] as const)("V1 warehouse-return step (%s)", (lng) => {
  const t = (lng === "en" ? enStation : arStation).internalWorkOrders.chain.warehouseReturn;
  it("an authorized Maintenance Manager sees it on a V1 order in MAINTENANCE_CLOSED, with the linked order, the optional note and the no-stock notice", async () => {
    const html = await render(lng, v1("MAINTENANCE_CLOSED"), MM);
    expect(has(html, "warehouse-return")).toBe(true);
    expect(html).toContain(t.button);
    expect(has(html, "warehouse-return-note")).toBe(true);
    expect(has(html, "warehouse-return-no-stock")).toBe(true); expect(html).toContain(t.noStock);
    expect(has(html, "parts-table")).toBe(true); expect(html).toContain("72");   // the linked warehouse order is listed
    expect(has(html, "warehouse-return-blocked")).toBe(false);
    expect(disabled(html, "warehouse-return")).toBe(false);
    expect(has(html, "legacy-close")).toBe(false);                               // Operations' close comes only after this step
  });
  it("unresolved parts: the reason is explained, the lines are listed and the button is disabled", async () => {
    const html = await render(lng, v1("MAINTENANCE_CLOSED", { partsReconciliation: unresolved }), MM);
    expect(has(html, "warehouse-return-blocked")).toBe(true); expect(html).toContain(t.blockedTitle);
    expect(has(html, "blocking-line")).toBe(true);
    expect(disabled(html, "warehouse-return")).toBe(true);
  });
  it.each([["V2 order", v2("MAINTENANCE_CLOSED"), MM], ["before Maintenance approval (UNDER_REVIEW)", v1("UNDER_REVIEW"), MM], ["still in progress", v1("IN_PROGRESS"), MM],
    ["already awaiting Operations", v1("AWAITING_OPS_CONFIRMATION"), MM], ["closed", v1("CLOSED"), MM]] as const)("hidden: %s", async (_n, order, as) => {
    expect(has(await render(lng, order, [...as]), "warehouse-return")).toBe(false);
  });
  it("hidden for a technician even when the role copy still carries the leftover key", async () => {
    const html = await render(lng, v1("MAINTENANCE_CLOSED"), ["internal_tasks.update_status", "internal_work_orders.warehouse_return", "internal_work_orders.read"]);
    expect(has(html, "warehouse-return")).toBe(false);
  });
  it("hidden without the required permission", async () => {
    expect(has(await render(lng, v1("MAINTENANCE_CLOSED"), ["internal_work_orders.read", "internal_work_orders.review"]), "warehouse-return")).toBe(false);
  });
  it("after the transition Operations keeps its existing legacy close action and the step is gone", async () => {
    const html = await render(lng, v1("AWAITING_OPS_CONFIRMATION", { workflow: { version: 1, legacy: true, stage: "AWAITING_OPERATIONS_REVIEW", nextActor: "OPERATIONS_MANAGER", partsBlockingClosure: false, canFinalClose: false } }), OPS);
    expect(has(html, "legacy-close")).toBe(true); expect(has(html, "warehouse-return")).toBe(false);
  });
  it("Arabic and English texts exist for every key of the step and its errors", () => {
    for (const k of ["title", "hint", "noStock", "blockedTitle", "blockedHint", "noteLabel", "button", "confirmTitle", "confirmBody", "confirm", "done"]) expect((t as Record<string, string>)[k], k).toBeTruthy();
    const e = (lng === "en" ? enStation : arStation).internalWorkOrders.chain.errors as Record<string, string>;
    for (const k of ["WORK_ORDER_NOT_MAINTENANCE_CLOSED", "forbidden", "notFound", "conflict"]) expect(e[k], k).toBeTruthy();
  });
});

describe("request and flags", () => {
  beforeEach(() => patch.mockClear());
  it("sends PATCH internal/work-orders/:id/warehouse-return with an empty body, or with the trimmed note", async () => {
    await warehouseReturnInternalWorkOrder(76);
    expect(patch).toHaveBeenLastCalledWith("internal/work-orders/76/warehouse-return", {});
    await warehouseReturnInternalWorkOrder(76, "  settled, order #72 closed ");
    expect(patch).toHaveBeenLastCalledWith("internal/work-orders/76/warehouse-return", { returnNote: "settled, order #72 closed" });
  });
  it("flag is V1 + MAINTENANCE_CLOSED + permission only", () => {
    const f = (o: InternalWorkOrderItem, p: boolean) => orderActionFlags(o, { review: true, opsConfirm: false, warehouseReturn: p }).warehouseReturn;
    expect(f(v1("MAINTENANCE_CLOSED"), true)).toBe(true);
    expect(f(v1("MAINTENANCE_CLOSED"), false)).toBe(false);
    expect(f(v2("MAINTENANCE_CLOSED"), true)).toBe(false);
    expect(f(v1("UNDER_REVIEW"), true)).toBe(false);
  });
});
