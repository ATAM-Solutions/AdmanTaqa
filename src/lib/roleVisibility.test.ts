import { describe, expect, it } from "vitest";
import { canAccessPath } from "./accessControl";

/**
 * Page visibility per default Job Title. The permission lists are the backend's seeded defaults
 * (enrgy-BE fuel-station / service-provider default roles); a change there must be mirrored here on purpose.
 */
const FS = {
  technician: ["assets.read", "internal_tasks.read", "internal_tasks.update_status", "internal_tasks.upload", "internal_work_orders.read", "warehouse_orders.create", "warehouse_orders.read", "warehouse_orders.submit", "warehouse_orders.update_status", "warehouse_orders.upload"],
  supervisor: ["assets.read", "internal_work_orders.read", "maintenance_issues.read", "maintenance_issues.supervisor_review", "stations.read"],
  operations: ["assets.read", "external_maintenance_v2.ops_closure", "external_maintenance_v2.read", "internal_work_orders.close", "internal_work_orders.ops_confirm", "internal_work_orders.read", "maintenance_issues.ops_approve", "maintenance_issues.read", "station.job_orders.read", "station.reports.review", "stations.read"],
  maintenance: ["assets.read", "external_maintenance_v2.create", "external_maintenance_v2.maintenance_review", "external_maintenance_v2.read", "internal_tasks.assign", "internal_tasks.close", "internal_tasks.read", "internal_tasks.review", "internal_work_orders.create", "internal_work_orders.read", "internal_work_orders.review", "internal_work_orders.update", "internal_work_orders.warehouse_return", "maintenance_issues.decide", "maintenance_issues.read", "station.job_orders.read", "station.maintenance_requests.create", "station.reports.review", "station.requests.read", "station.requests.select_quote", "stations.read", "team.invite", "team.read", "warehouse.read", "warehouse_orders.maintenance_approve", "warehouse_orders.read"],
  warehouse: ["warehouse.manage", "warehouse.read", "warehouse_orders.approve", "warehouse_orders.assign", "warehouse_orders.close", "warehouse_orders.create", "warehouse_orders.deliver", "warehouse_orders.issue", "warehouse_orders.read", "warehouse_orders.reject", "warehouse_orders.review", "warehouse_orders.update_status", "warehouse_orders.upload"],
  manager: ["assets.create", "assets.manage_records", "assets.read", "assets.update", "internal_work_orders.read", "job_orders.read", "maintenance_issues.create", "maintenance_issues.read", "proposals.accept", "proposals.read", "proposals.reject", "quotations.read", "requests.read", "station.job_orders.read", "station.job_orders.review", "station.maintenance_requests.create", "station.reports.review", "station.requests.read", "stations.read", "team.invite", "team.read", "warehouse.read", "warehouse_orders.read", "workorders.approve", "workorders.create", "workorders.read", "workorders.update"],
};
const SP = {
  owner: ["assets.read", "operators.create", "operators.read", "operators.update", "payments.read", "provider.job_orders.assign_operator", "provider.job_orders.read", "provider.job_orders.update_status", "provider.job_orders.upload", "provider.jobs.execute", "provider.jobs.submit_review", "provider.payments.confirm_received", "provider.quotes.create", "provider.quotes.revise", "provider.quotes.withdraw", "provider.reports.create", "provider.reports.submit", "provider.rfqs.read", "provider.visits.checkin", "provider.visits.upload", "provider_job_v2.assign_technician", "provider_job_v2.execute", "provider_job_v2.review_report", "provider_warehouse.approve", "provider_warehouse.create", "provider_warehouse.issue", "provider_warehouse.read", "team.assign_roles", "team.deactivate", "team.invite", "team.read"],
  operator: ["assets.read", "documents.read", "documents.upload", "provider.job_orders.read", "provider.job_orders.update_status", "provider.job_orders.upload", "provider.jobs.execute", "provider.jobs.manual_checkin", "provider.jobs.submit_review", "provider.reports.create", "provider.reports.submit", "provider.visits.checkin", "provider.visits.upload", "quotations.read", "visits.read"],
  accountant: ["payments.read", "provider.job_orders.read", "provider.payments.confirm_received"],
};

const fs = (who: keyof typeof FS, path: string) => canAccessPath(path, "FUEL_STATION", FS[who]);
const sp = (who: keyof typeof SP, path: string) => canAccessPath(path, "SERVICE_PROVIDER", SP[who]);
const ORDER_PAGES = ["/internal-work-orders", "/internal-work-orders/5", "/internal-work-orders/review-queue"];

describe("Fuel Station job titles: pages", () => {
  it("Technician works from My tasks: no order, report, request, user or station pages", () => {
    for (const p of ["/my-tasks", "/internal-tasks/9", "/warehouse-requests", "/assets", "/"]) expect(fs("technician", p)).toBe(true);
    for (const p of [...ORDER_PAGES, "/maintenance-reports", "/maintenance-reports/create", "/maintenance-reports/3", "/station-requests", "/station-requests/create", "/station-requests/4",
      "/station-job-orders", "/linked-providers", "/work-orders/2", "/work-orders/review-queue", "/users", "/roles", "/branches", "/company", "/warehouse-inventory"])
      expect(fs("technician", p), p).toBe(false);
  });

  it("only the Maintenance Manager reaches the review queue and the internal/external request form (with the Station Manager's direct form a documented policy question)", () => {
    expect(fs("maintenance", "/internal-work-orders/review-queue")).toBe(true);
    for (const who of ["technician", "supervisor", "operations", "warehouse", "manager"] as const) expect(fs(who, "/internal-work-orders/review-queue"), who).toBe(false);
    for (const who of ["technician", "supervisor", "operations", "warehouse"] as const) expect(fs(who, "/station-requests/create"), who).toBe(false);
  });

  it("Regional Supervisor and Operations Manager review reports; neither manages orders or requests", () => {
    for (const who of ["supervisor", "operations"] as const) {
      expect(fs(who, "/maintenance-reports")).toBe(true);
      expect(fs(who, "/maintenance-reports/create")).toBe(false);
      expect(fs(who, "/station-requests/create")).toBe(false);
      expect(fs(who, "/internal-work-orders/review-queue")).toBe(false);
      expect(fs(who, "/my-tasks")).toBe(false);
    }
    expect(fs("operations", "/station-job-orders")).toBe(true);
    expect(fs("supervisor", "/station-job-orders")).toBe(false);
  });

  it("Warehouse Manager sees warehouse pages only", () => {
    for (const p of ["/warehouse-requests", "/warehouse-inventory"]) expect(fs("warehouse", p)).toBe(true);
    for (const p of [...ORDER_PAGES, "/maintenance-reports", "/station-requests", "/station-job-orders", "/my-tasks", "/internal-tasks/9", "/assets", "/branches", "/users"]) expect(fs("warehouse", p), p).toBe(false);
  });

  it("Warehouse management pages follow warehouse.read: Warehouse Manager and Maintenance Manager yes, Technician no", () => {
    for (const p of ["/warehouses", "/warehouses/4"]) {
      expect(fs("warehouse", p), p).toBe(true);
      expect(fs("maintenance", p), p).toBe(true);
      expect(fs("technician", p), p).toBe(false);
    }
  });

  it("Maintenance Manager manages orders and tasks but not warehouse inventory or My tasks", () => {
    for (const p of [...ORDER_PAGES, "/internal-tasks/9", "/maintenance-reports", "/station-requests", "/station-requests/create"]) expect(fs("maintenance", p), p).toBe(true);
    expect(fs("maintenance", "/my-tasks")).toBe(false);
    expect(fs("maintenance", "/warehouse-inventory")).toBe(true);
  });
});

describe("Service Provider job titles: pages", () => {
  it("RFQs and operators belong to the owner/manager; job orders to everyone with job_orders.read", () => {
    for (const p of ["/provider-rfqs", "/provider-rfqs/1", "/operators"]) {
      expect(sp("owner", p), p).toBe(true);
      expect(sp("operator", p), p).toBe(false);
      expect(sp("accountant", p), p).toBe(false);
    }
    for (const who of ["owner", "operator", "accountant"] as const) expect(sp(who, "/provider-job-orders")).toBe(true);
  });
  it("provider users never reach fuel-station pages", () => {
    for (const p of ["/internal-work-orders", "/maintenance-reports", "/station-requests", "/my-tasks", "/assets/1"]) expect(sp("owner", p), p).toBe(false);
  });
});
