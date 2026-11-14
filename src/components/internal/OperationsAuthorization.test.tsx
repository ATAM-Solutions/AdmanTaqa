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
import { orderActionFlags } from "@/lib/internalReviewChain";
import type { InternalWorkOrderItem, PartsReconciliation, ReviewChainActor } from "@/types/internalWorkOrder";

const MM = ["internal_work_orders.review", "internal_tasks.review", "internal_work_orders.read"];
const parts = (over: Partial<PartsReconciliation> = {}): PartsReconciliation => ({ hasIssuedParts: false, blocking: false, blockingLines: 0, totals: { issued: 0, received: 0, used: 0, returned: 0, returnPending: 0, unresolved: 0 }, lines: [], ...over });
const chain = (status: string, stage: string, nextActor: ReviewChainActor | null, over: Partial<InternalWorkOrderItem> = {}): InternalWorkOrderItem => ({ id: 70, title: "Pump", status: status as InternalWorkOrderItem["status"], workflowVersion: 2, workflow: { version: 2, legacy: false, stage, nextActor, partsBlockingClosure: false, canFinalClose: true }, partsReconciliation: parts(), reviewHistory: [], tasks: [], ...over });
const legacy = (status: string, over: Partial<InternalWorkOrderItem> = {}): InternalWorkOrderItem => ({ id: 68, title: "Old", status: status as InternalWorkOrderItem["status"], workflowVersion: 1, workflow: { version: 1, legacy: true, stage: "IN_EXECUTION", nextActor: null, partsBlockingClosure: false, canFinalClose: false }, tasks: [], ...over });

async function render(lng: "en" | "ar", order: InternalWorkOrderItem, as: string[]) {
  perms = as;
  const i = createInstance();
  await i.use(initReactI18next).init({ lng, fallbackLng: "en", ns: ["station"], defaultNS: "station", resources: { en: { station: enStation }, ar: { station: arStation } }, interpolation: { escapeValue: false } });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  return renderToStaticMarkup(<QueryClientProvider client={qc}><I18nextProvider i18n={i}><MemoryRouter><div dir={lng === "ar" ? "rtl" : "ltr"}><InternalReviewChainPanel order={order} /></div></MemoryRouter></I18nextProvider></QueryClientProvider>);
}
const has = (html: string, id: string) => html.includes(`data-testid="${id}"`);

import type { ViewerOperations } from "@/types/internalWorkOrder";
import { viewerOperations } from "@/lib/internalReviewChain";

/**
 * Operations visibility follows the SERVER's per-viewer decision (`viewerActions.operations`), not the ops_confirm key alone:
 * production role copies still carry the leftover key. Covers default roles with the inherited key, Operations Manager, Station
 * Owner, custom role, same-user Maintenance + Operations approval, V1/V2, direct navigation and Arabic RTL.
 */
const KEY = ["internal_work_orders.ops_confirm", "internal_work_orders.read"];
const allow = (over: Partial<ViewerOperations["confirm"]> = {}): ViewerOperations => ({ confirm: { allowed: true, reason: null, ...over }, return: { allowed: true, reason: null } });
const deny = (reason: string): ViewerOperations => ({ confirm: { allowed: false, reason }, return: { allowed: false, reason } });
const withView = (o: InternalWorkOrderItem, v: ViewerOperations | undefined): InternalWorkOrderItem => ({ ...o, viewerActions: v ? { operations: v } : undefined });
const awaiting = () => chain("AWAITING_OPS_CONFIRMATION", "AWAITING_OPERATIONS_REVIEW", "OPERATIONS_MANAGER");

describe.each(["en", "ar"] as const)("Operations visibility follows the server (%s)", (lng) => {
  it.each([
    ["Maintenance Manager", "OPERATIONS_ROLE_REQUIRED"],
    ["Warehouse Manager", "OPERATIONS_ROLE_REQUIRED"],
    ["Station Manager", "OPERATIONS_ROLE_REQUIRED"],
    ["Regional Supervisor", "OPERATIONS_ROLE_REQUIRED"],
    ["Technician", "TECHNICIAN_ROLE_RESTRICTED"],
  ])("default role %s holding the leftover ops_confirm key sees no Operations action", async (_role, reason) => {
    const html = await render(lng, withView(awaiting(), deny(reason)), KEY);
    expect(has(html, "ops-confirm")).toBe(false);
    expect(has(html, "ops-return")).toBe(false);
    expect(has(html, "banner-you")).toBe(false);
  });

  it("Operations Manager and the Station Owner (server says allowed) see Confirm and Return", async () => {
    const html = await render(lng, withView(awaiting(), allow()), KEY);
    expect(has(html, "ops-confirm")).toBe(true);
    expect(has(html, "ops-return")).toBe(true);
    expect(has(html, "banner-you")).toBe(true);
  });

  it("a supported custom role that the server allows sees the actions; one the server refuses does not (no role-name guessing)", async () => {
    expect(has(await render(lng, withView(awaiting(), allow()), KEY), "ops-confirm")).toBe(true);
    expect(has(await render(lng, withView(awaiting(), deny("MISSING_PERMISSION")), KEY), "ops-confirm")).toBe(false);
  });

  it("the Maintenance approver cannot confirm but may still return, and is told why", async () => {
    const view: ViewerOperations = { confirm: { allowed: false, reason: "SEPARATION_OF_DUTIES" }, return: { allowed: true, reason: null } };
    const html = await render(lng, withView(awaiting(), view), KEY);
    expect(has(html, "ops-confirm")).toBe(false);
    expect(has(html, "ops-return")).toBe(true);
    expect(has(html, "ops-separation-note")).toBe(true);
    expect(html).toContain((lng === "ar" ? arStation : enStation).internalWorkOrders.chain.ops.separationNote.slice(0, 20));
  });

  it("the Station Owner who approved Maintenance still confirms (audited override) — flagged by the server, no note", async () => {
    const html = await render(lng, withView(awaiting(), allow({ ownerOverride: true })), KEY);
    expect(has(html, "ops-confirm")).toBe(true);
    expect(has(html, "ops-separation-note")).toBe(false);
  });

  it("direct navigation to an order awaiting Operations shows no action to a refused viewer, only the history/banner", async () => {
    const html = await render(lng, withView(awaiting(), deny("OPERATIONS_ROLE_REQUIRED")), KEY);
    expect(has(html, "order-actions")).toBe(false);
    expect(has(html, "banner-waiting")).toBe(true);
  });

  it("Maintenance final closure is untouched by the Operations restriction", async () => {
    const html = await render(lng, withView(chain("AWAITING_FINAL_CLOSURE", "AWAITING_FINAL_CLOSURE", "MAINTENANCE_MANAGER"), deny("OPERATIONS_ROLE_REQUIRED")), MM);
    expect(has(html, "final-close")).toBe(true);
    expect(has(html, "ops-confirm")).toBe(false);
  });

  it("V1: the legacy Operations close follows the same server decision; legacy review is untouched", async () => {
    const v1 = legacy("AWAITING_OPS_CONFIRMATION");
    expect(has(await render(lng, withView(v1, allow()), KEY), "legacy-close")).toBe(true);
    expect(has(await render(lng, withView(v1, deny("OPERATIONS_ROLE_REQUIRED")), KEY), "legacy-close")).toBe(false);
    expect(has(await render(lng, withView(legacy("UNDER_REVIEW"), deny("OPERATIONS_ROLE_REQUIRED")), MM), "legacy-approve")).toBe(true);
  });

  it("an older server without viewerActions keeps the permission-key behaviour (the routes still refuse)", async () => {
    expect(has(await render(lng, withView(awaiting(), undefined), KEY), "ops-confirm")).toBe(true);
    expect(has(await render(lng, withView(awaiting(), undefined), ["internal_work_orders.read"]), "ops-confirm")).toBe(false);
  });

  it("a technician session never gets Operations actions even with the key", async () => {
    expect(has(await render(lng, withView(awaiting(), deny("TECHNICIAN_ROLE_RESTRICTED")), [...KEY, "internal_tasks.update_status"]), "ops-confirm")).toBe(false);
  });
});

describe("viewerOperations / error messages", () => {
  it("is authoritative when the server sends the block, key-based otherwise", () => {
    expect(viewerOperations({ viewerActions: { operations: deny("OPERATIONS_ROLE_REQUIRED") } }, true)).toMatchObject({ confirm: false, return: false, authoritative: true, reason: "OPERATIONS_ROLE_REQUIRED" });
    expect(viewerOperations({ viewerActions: undefined }, true)).toMatchObject({ confirm: true, return: true, authoritative: false });
    expect(viewerOperations({ viewerActions: undefined }, false)).toMatchObject({ confirm: false, return: false });
  });

  it("orderActionFlags separates confirm from return", () => {
    const v: ViewerOperations = { confirm: { allowed: false, reason: "SEPARATION_OF_DUTIES" }, return: { allowed: true, reason: null } };
    const f = orderActionFlags(withView(awaiting(), v), { review: false, opsConfirm: true });
    expect([f.opsConfirm, f.opsReturn]).toEqual([false, true]);
  });

  it.each(["en", "ar"] as const)("OPERATIONS_ROLE_REQUIRED and SEPARATION_OF_DUTIES have a clear %s message", (lng) => {
    const errors = (lng === "ar" ? arStation : enStation).internalWorkOrders.chain.errors as Record<string, string>;
    for (const code of ["OPERATIONS_ROLE_REQUIRED", "SEPARATION_OF_DUTIES"]) {
      expect(errors[code]?.length).toBeGreaterThan(20);
      if (lng === "ar") expect(errors[code]).toMatch(/[؀-ۿ]/);
    }
  });
});
