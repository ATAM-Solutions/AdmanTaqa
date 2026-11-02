import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import enStation from "@/i18n/locales/en/station.json";
import arStation from "@/i18n/locales/ar/station.json";

vi.mock("@/i18n/config", async () => {
  const { createInstance } = await import("i18next");
  const i = createInstance();
  await i.init({ lng: "en", resources: { en: {} }, interpolation: { escapeValue: false } });
  return { default: i, isRtl: () => false };
});
vi.mock("@/api/config", () => ({ default: {} }));
let perms: string[] = [];
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { id: 1 }, hasPermission: (p: string) => perms.includes(p), permissions: perms }),
}));

import InternalReviewChainPanel from "./InternalReviewChainPanel";
import { normalizePartsLines } from "@/api/services/internalWorkOrderService";
import { isChainOrder, isStuckLegacyInProgress, orderActionFlags, techActionsForOrder, reviewReturnNeedsComment } from "@/lib/internalReviewChain";
import type { InternalWorkOrderItem, PartsReconciliation } from "@/types/internalWorkOrder";

const OPS = ["internal_work_orders.ops_confirm", "internal_work_orders.read"];
const MM = ["internal_work_orders.review", "internal_tasks.review", "internal_work_orders.read"];
const TECH: string[] = ["internal_tasks.update_status"];

const parts = (over: Partial<PartsReconciliation> = {}): PartsReconciliation => ({
  hasIssuedParts: false, blocking: false, blockingLines: 0,
  totals: { issued: 0, received: 0, used: 0, returned: 0, returnPending: 0, unresolved: 0 }, lines: [], ...over,
});
const blockingParts = parts({
  hasIssuedParts: true, blocking: true, blockingLines: 1,
  totals: { issued: 4, received: 4, used: 0, returned: 0, returnPending: 0, unresolved: 4 },
  lines: [{ warehouseOrderId: 5, warehouseOrderStatus: "DELIVERED", assignedTechnicianId: 7, itemId: 1, partName: "Oil filter", issued: 4, received: 4, used: null, returned: 0, returnPending: 0, unresolved: 4, shortfall: 2, usageConfirmed: false, blockers: ["USAGE_NOT_CONFIRMED", "RETURN_NOT_RECORDED"] }],
});

const chain = (status: string, stage: string, nextActor: InternalWorkOrderItem["workflow"] extends infer W ? (W extends { nextActor: infer A } ? A : never) : never, over: Partial<InternalWorkOrderItem> = {}): InternalWorkOrderItem => ({
  id: 70, title: "Pump", status: status as InternalWorkOrderItem["status"], workflowVersion: 2,
  workflow: { version: 2, legacy: false, stage, nextActor, partsBlockingClosure: false, canFinalClose: true },
  partsReconciliation: parts(), reviewHistory: [], tasks: [], ...over,
});
const legacy = (status: string, over: Partial<InternalWorkOrderItem> = {}): InternalWorkOrderItem => ({
  id: 68, title: "Old", status: status as InternalWorkOrderItem["status"], workflowVersion: 1,
  workflow: { version: 1, legacy: true, stage: "IN_EXECUTION", nextActor: null, partsBlockingClosure: false, canFinalClose: false }, tasks: [], ...over,
});

async function render(lng: "en" | "ar", order: InternalWorkOrderItem, as: string[]) {
  perms = as;
  const i = createInstance();
  await i.use(initReactI18next).init({
    lng, fallbackLng: "en", ns: ["station"], defaultNS: "station",
    resources: { en: { station: enStation }, ar: { station: arStation } }, interpolation: { escapeValue: false },
  });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  return renderToStaticMarkup(
    <QueryClientProvider client={qc}><I18nextProvider i18n={i}><MemoryRouter><div dir={lng === "ar" ? "rtl" : "ltr"}><InternalReviewChainPanel order={order} /></div></MemoryRouter></I18nextProvider></QueryClientProvider>,
  );
}
const has = (html: string, id: string) => html.includes(`data-testid="${id}"`);
const disabled = (html: string, id: string) => new RegExp(`<button[^>]*\\sdisabled=""[^>]*data-testid="${id}"|<button[^>]*data-testid="${id}"[^>]*\\sdisabled=""`).test(html);

describe.each(["en", "ar"] as const)("InternalReviewChainPanel (%s)", (lng) => {
  it("Operations sees Confirm and Return only at AWAITING_OPS_CONFIRMATION, Return disabled without a comment", async () => {
    const html = await render(lng, chain("AWAITING_OPS_CONFIRMATION", "AWAITING_OPERATIONS_REVIEW", "OPERATIONS_MANAGER"), OPS);
    expect(has(html, "ops-confirm")).toBe(true);
    expect(has(html, "ops-return")).toBe(true);
    expect(disabled(html, "ops-return")).toBe(true);
    expect(disabled(html, "ops-confirm")).toBe(false);
    expect(has(html, "ops-return-hint")).toBe(true);
    expect(has(html, "banner-you")).toBe(true);
    expect(has(html, "final-close")).toBe(false);
    expect(has(html, "legacy-approve")).toBe(false);
    expect(has(html, "legacy-close")).toBe(false);
    for (const stage of ["IN_PROGRESS", "AWAITING_FINAL_CLOSURE", "CLOSED"]) {
      const other = await render(lng, chain(stage, "IN_EXECUTION", null), OPS);
      expect(has(other, "ops-confirm")).toBe(false);
      expect(has(other, "ops-return")).toBe(false);
    }
  });

  it("Maintenance sees Close only at AWAITING_FINAL_CLOSURE and no Operations actions", async () => {
    const html = await render(lng, chain("AWAITING_FINAL_CLOSURE", "AWAITING_FINAL_CLOSURE", "MAINTENANCE_MANAGER"), MM);
    expect(has(html, "final-close")).toBe(true);
    expect(disabled(html, "final-close")).toBe(false);
    expect(has(html, "ops-confirm")).toBe(false);
    expect(has(html, "close-blocked")).toBe(false);
    const early = await render(lng, chain("AWAITING_OPS_CONFIRMATION", "AWAITING_OPERATIONS_REVIEW", "OPERATIONS_MANAGER"), MM);
    expect(has(early, "final-close")).toBe(false);
    expect(has(early, "banner-waiting")).toBe(true);
  });

  it("Operations does not see the final close action", async () => {
    const html = await render(lng, chain("AWAITING_FINAL_CLOSURE", "AWAITING_FINAL_CLOSURE", "MAINTENANCE_MANAGER"), OPS);
    expect(has(html, "final-close")).toBe(false);
    expect(has(html, "banner-waiting")).toBe(true);
  });

  it("technician sees the banner but no actions", async () => {
    const html = await render(lng, chain("AWAITING_OPS_CONFIRMATION", "AWAITING_OPERATIONS_REVIEW", "OPERATIONS_MANAGER"), TECH);
    expect(has(html, "next-action-banner")).toBe(true);
    expect(has(html, "order-actions")).toBe(false);
  });

  it("disables Close and lists the blocking lines while parts are unresolved", async () => {
    const html = await render(lng, chain("AWAITING_FINAL_CLOSURE", "AWAITING_FINAL_CLOSURE", "MAINTENANCE_MANAGER", { partsReconciliation: blockingParts, workflow: { version: 2, legacy: false, stage: "AWAITING_FINAL_CLOSURE", nextActor: "MAINTENANCE_MANAGER", partsBlockingClosure: true, canFinalClose: false } }), MM);
    expect(disabled(html, "final-close")).toBe(true);
    expect(has(html, "close-blocked")).toBe(true);
    expect(html).toContain("Oil filter");
    expect(has(html, "blocking-line")).toBe(true);
    expect(has(html, "parts-table")).toBe(true);
    expect(has(html, "blocker-USAGE_NOT_CONFIRMED")).toBe(true);
    expect(has(html, "parts-shortfall")).toBe(true);
    expect(html).toContain("overflow-x-auto");
  });

  it("no issued parts: a note instead of a table, and no blocker", async () => {
    const html = await render(lng, chain("AWAITING_FINAL_CLOSURE", "AWAITING_FINAL_CLOSURE", "MAINTENANCE_MANAGER"), MM);
    expect(has(html, "parts-none")).toBe(true);
    expect(has(html, "parts-table")).toBe(false);
    expect(disabled(html, "final-close")).toBe(false);
  });

  it("shows every review round, newest first", async () => {
    const html = await render(lng, chain("IN_PROGRESS", "IN_EXECUTION", "TECHNICIAN", { reviewHistory: [
      { id: 1, stage: "MAINTENANCE_REVIEW", decision: "APPROVED", comment: "ok first", internalTaskId: 9, actor: { id: 2, fullName: "Mona" }, createdAt: "2026-10-30T08:00:00.000Z" },
      { id: 2, stage: "OPERATIONS_REVIEW", decision: "RETURNED", comment: "redo the seal", internalTaskId: null, actor: { id: 3, fullName: "Omar" }, createdAt: "2026-10-30T09:00:00.000Z" },
    ] }), TECH);
    expect(has(html, "review-history")).toBe(true);
    expect((html.match(/data-testid="history-entry"/g) ?? []).length).toBe(2);
    expect(html.indexOf("redo the seal")).toBeLessThan(html.indexOf("ok first"));
    expect(html).toContain("Omar");
    expect(has(html, "decision-RETURNED")).toBe(true);
  });

  it("legacy orders keep the legacy buttons and none of the chain ones", async () => {
    const review = await render(lng, legacy("UNDER_REVIEW"), MM);
    expect(has(review, "legacy-approve")).toBe(true);
    expect(has(review, "legacy-reject")).toBe(true);
    expect(has(review, "next-action-banner")).toBe(false);
    expect(has(review, "parts-reconciliation")).toBe(false);
    const close = await render(lng, legacy("AWAITING_OPS_CONFIRMATION"), OPS);
    expect(has(close, "legacy-close")).toBe(true);
    expect(has(close, "ops-confirm")).toBe(false);
    expect(has(close, "ops-return")).toBe(false);
  });

  it("stuck legacy IN_PROGRESS order (every open task completed) shows Approve/Reject with a hint", async () => {
    const stuck = legacy("IN_PROGRESS", { tasks: [{ id: 1, status: "COMPLETED" }, { id: 2, status: "CLOSED" }] });
    const html = await render(lng, stuck, MM);
    expect(has(html, "legacy-approve")).toBe(true);
    expect(has(html, "legacy-reject")).toBe(true);
    expect(has(html, "legacy-stuck-hint")).toBe(true);
    const notStuck = legacy("IN_PROGRESS", { tasks: [{ id: 1, status: "COMPLETED" }, { id: 2, status: "IN_PROGRESS" }] });
    expect(has(await render(lng, notStuck, MM), "legacy-approve")).toBe(false);
    expect(has(await render(lng, legacy("IN_PROGRESS"), MM), "legacy-approve")).toBe(false);
    // a chain order in the same shape never gets the legacy review
    const chainLike = chain("IN_PROGRESS", "IN_EXECUTION", "TECHNICIAN", { tasks: [{ id: 1, status: "COMPLETED" }] });
    expect(has(await render(lng, chainLike, MM), "legacy-approve")).toBe(false);
  });
});

describe("review chain pure helpers", () => {
  it("tells chain from legacy orders", () => {
    expect(isChainOrder(chain("IN_PROGRESS", "IN_EXECUTION", null))).toBe(true);
    expect(isChainOrder(legacy("IN_PROGRESS"))).toBe(false);
    expect(isChainOrder({ workflowVersion: undefined })).toBe(false);
    expect(isStuckLegacyInProgress(legacy("IN_PROGRESS", { tasks: [{ id: 1, status: "COMPLETED" }] }))).toBe(true);
  });
  it("only chain orders drop the technician's submit-for-review step and need a return comment", () => {
    const acts = [{ id: "returnMaterials" }, { id: "submitReview" }];
    expect(techActionsForOrder(acts, 2).map((a) => a.id)).toEqual(["returnMaterials"]);
    expect(techActionsForOrder(acts, 1).map((a) => a.id)).toEqual(["returnMaterials", "submitReview"]);
    expect(techActionsForOrder(acts, undefined)).toHaveLength(2);
    expect(reviewReturnNeedsComment(2)).toBe(true);
    expect(reviewReturnNeedsComment(1)).toBe(false);
  });
  it("derives action flags per permission", () => {
    const f = orderActionFlags(chain("AWAITING_FINAL_CLOSURE", "AWAITING_FINAL_CLOSURE", null), { review: true, opsConfirm: true });
    expect(f.finalClose).toBe(true);
    expect(f.opsConfirm).toBe(false);
    expect(orderActionFlags(chain("AWAITING_FINAL_CLOSURE", "x", null), { review: false, opsConfirm: true }).finalClose).toBe(false);
  });
  it("normalizes the PARTS_UNRESOLVED line shape", () => {
    const [l] = normalizePartsLines([{ partName: "Seal", issued: 2, received: null, used: null, blockers: ["AWAITING_RECEIPT"] }]);
    expect(l.partName).toBe("Seal");
    expect(l.received).toBeNull();
    expect(l.blockers).toEqual(["AWAITING_RECEIPT"]);
  });
});
