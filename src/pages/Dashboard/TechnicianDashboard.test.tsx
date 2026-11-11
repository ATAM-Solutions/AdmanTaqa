import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import enDash from "@/i18n/locales/en/dashboard.json";
import arDash from "@/i18n/locales/ar/dashboard.json";
import enNav from "@/i18n/locales/en/nav.json";
import arNav from "@/i18n/locales/ar/nav.json";
import enTasks from "@/i18n/locales/en/tasks.json";
import arTasks from "@/i18n/locales/ar/tasks.json";
import enCommon from "@/i18n/locales/en/common.json";
import arCommon from "@/i18n/locales/ar/common.json";

vi.mock("@/i18n/config", async () => {
  const { createInstance } = await import("i18next");
  const i = createInstance();
  await i.init({ lng: "en", resources: { en: {} }, interpolation: { escapeValue: false } });
  return { default: i, isRtl: () => false };
});
vi.mock("@/api/config", () => ({ default: {} }));

// a Technician role copy as found in the field: default keys + leftovers (ops_confirm, warehouse_return, station.*, quotations)
const LEGACY_TECH = ["assets.read", "internal_tasks.read", "internal_tasks.update_status", "internal_tasks.upload", "internal_work_orders.ops_confirm", "internal_work_orders.read", "internal_work_orders.warehouse_return", "quotations.read", "payments.read", "station.job_orders.read", "station.job_orders.review", "station.reports.review", "station.requests.read", "warehouse_orders.create", "warehouse_orders.read", "warehouse_orders.submit", "warehouse_orders.update_status"];
const perms = LEGACY_TECH;
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    organization: { id: 1, type: "FUEL_STATION", name: "Co", nameAr: "شركة", isActive: true },
    roles: [{ id: 1, name: "Technician" }], permissions: perms, hasPermission: (p: string) => perms.includes(p),
  }),
}));
const DATA = {
  visibility: { stations: false, employees: false, maintenanceIssues: false, internalWorkOrders: false, externalRequests: false, technician: true },
  kpis: { branches: 0, employees: 0, openMaintenanceIssues: 0, internalWorkOrders: { total: 0, open: 0 }, externalRequests: { total: 0, open: 0 }, quotesAwaitingDecision: 0, activeJobs: 0, awaitingPayment: 0, completedAwaitingApproval: 0, completedJobs: 0 },
  charts: { requestsOverTime: [], internalVsExternal: { internal: 0, external: 0 }, jobsByStatus: [], branchActivity: [], providerUsage: [] },
  technician: {
    tasks: { assigned: 2, inProgress: 3, pendingApproval: 4, completed: 5 }, sparePartsActionRequired: 6, sparePartsTotal: 7,
    recentTasks: [{ id: 86, status: "ASSIGNED", updatedAt: "2026-11-10T10:00:00Z", title: "ضعف ضغط في المضخة", internalWorkOrderId: 69, branch: { id: 1, nameEn: "Station 1", nameAr: "محطة 1" } }],
  },
};
vi.mock("@/hooks/AdminDashboard/useGetStationDashboard", () => ({ default: () => ({ data: DATA, isLoading: false, error: null, refetch: () => {} }) }));

import FuelStationDashboard from "./FuelStationDashboard";

async function render(lng: "en" | "ar") {
  const i = createInstance();
  await i.use(initReactI18next).init({
    lng, fallbackLng: "en", ns: ["dashboard", "nav", "tasks", "common"], defaultNS: "dashboard",
    resources: { en: { dashboard: enDash, nav: enNav, tasks: enTasks, common: enCommon }, ar: { dashboard: arDash, nav: arNav, tasks: arTasks, common: arCommon } }, interpolation: { escapeValue: false },
  });
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}><I18nextProvider i18n={i}><MemoryRouter><FuelStationDashboard /></MemoryRouter></I18nextProvider></QueryClientProvider>,
  );
}

describe.each(["en", "ar"] as const)("technician dashboard (%s)", (lng) => {
  const d = lng === "en" ? enDash : arDash;
  it("shows only the technician's own widgets, with the server's numbers", async () => {
    const html = await render(lng);
    expect(html).toContain('data-testid="technician-landing"');
    for (const k of ["assigned", "inProgress", "pendingApproval", "completed", "partsAction"] as const) expect(html).toContain(d.technician.kpi[k]);
    for (const n of ["2", "3", "4", "5", "6"]) expect(html).toContain(`>${n}<`);
    expect(html).toContain('href="/internal-tasks/86"');
    expect(html).toContain("ضعف ضغط في المضخة");
  });
  it("shows nothing external, financial or company-wide, and links only to technician pages", async () => {
    const html = await render(lng);
    for (const bad of ["/station-requests", "/station-job-orders", "/quotations", "/assets", "/internal-work-orders", "/branches", "/users", "/maintenance-reports", "/company", "/linked-providers"]) expect(html, bad).not.toContain(`href="${bad}`);
    for (const text of [d.station.kpi.externalRequests, d.station.kpi.quotesAwaitingDecision, d.station.kpi.awaitingPayment, d.station.kpi.activeJobs, d.station.panels.recentActivity]) expect(html).not.toContain(text);
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    for (const h of hrefs) expect(["/my-tasks", "/warehouse-requests", "/internal-tasks/86"]).toContain(h);
  });
  it("uses RTL-safe text direction for task titles", async () => {
    expect(await render(lng)).toContain('dir="auto"');
  });
});
