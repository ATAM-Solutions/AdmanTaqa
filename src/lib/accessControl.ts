import type { Organization } from "@/types/auth";
import { matchPath } from "react-router-dom";
import { normalizePermissionCode } from "@/lib/permissions";

export type OrgType = Organization["type"];

export type AccessRule = {
  orgTypes?: OrgType[];
  anyPermissions?: string[];
  allPermissions?: string[];
  /**
   * Permission requirement that applies ONLY to the listed organization types (other types keep
   * org-type gating). Used where a shared page is open to every tenant type but, for fuel stations,
   * must follow the role's real capabilities instead of "any fuel-station user".
   */
  orgTypePermissions?: Partial<Record<OrgType, string[]>>;
  /**
   * Hide the page from "executor-only" sessions: they can update task status (a technician) but hold no
   * order/task management permission. They work through My tasks; the order pages are not their workspace
   * (Report 3 finding 1). The server applies the same rule to the order APIs (isExecutorOnly).
   */
  excludeExecutorOnly?: boolean;
};

/** Mirrors enrgy-BE `isExecutorOnly` — keep the two lists in sync. */
const MANAGEMENT_PERMISSIONS = [
  "internal_work_orders.create",
  "internal_work_orders.update",
  "internal_work_orders.review",
  "internal_work_orders.close",
  "internal_work_orders.warehouse_return",
  "internal_work_orders.ops_confirm",
  "internal_tasks.assign",
  "internal_tasks.review",
  "internal_tasks.close",
];

export const isExecutorOnly = (permissions: string[]): boolean => {
  const granted = new Set(permissions.map(normalizePermissionCode));
  return granted.has("internal_tasks.update_status") && !MANAGEMENT_PERMISSIONS.some((p) => granted.has(p));
};

// Route keys match router child paths without leading slash.
export const ROUTE_ACCESS_RULES: Record<string, AccessRule> = {
  // Every org type with a real dashboard variant (Dashboard.tsx dispatches per type).
  // Authority deliberately excluded — no dashboard variant exists for it.
  dashboard: {
    orgTypes: ["SUPER_ADMIN", "FUEL_STATION", "SERVICE_PROVIDER"],
  },
  organizations: {
    orgTypes: ["AUTHORITY", "SUPER_ADMIN"],
    anyPermissions: ["organizations:approve", "organizations:read"],
  },
  "organizations/rejected": {
    orgTypes: ["AUTHORITY", "SUPER_ADMIN"],
    anyPermissions: ["organizations:approve", "organizations:read"],
  },
  // SUPER_ADMIN company onboarding wizard (create company → stations → company admin).
  "organizations/new": {
    orgTypes: ["SUPER_ADMIN"],
  },
  "organizations/:id": {
    orgTypes: ["AUTHORITY", "SUPER_ADMIN"],
    anyPermissions: ["organizations:approve", "organizations:read"],
  },
  "fuel-stations": {
    orgTypes: ["AUTHORITY", "SUPER_ADMIN"],
    anyPermissions: ["organizations:approve", "organizations:read"],
  },
  "fuel-stations/pending": {
    orgTypes: ["AUTHORITY", "SUPER_ADMIN"],
    anyPermissions: ["organizations:approve", "organizations:read"],
  },
  "fuel-stations/rejected": {
    orgTypes: ["AUTHORITY", "SUPER_ADMIN"],
    anyPermissions: ["organizations:approve", "organizations:read"],
  },
  "fuel-stations/:id": {
    orgTypes: ["AUTHORITY", "SUPER_ADMIN"],
    anyPermissions: ["organizations:approve", "organizations:read"],
  },
  onboarding: {
    orgTypes: ["AUTHORITY"],
    anyPermissions: ["organizations:approve", "organizations:read"],
  },
  "onboarding/:id": {
    orgTypes: ["AUTHORITY"],
    anyPermissions: ["organizations:approve", "organizations:read"],
  },
  inspections: {
    orgTypes: ["AUTHORITY", "SUPER_ADMIN"],
    anyPermissions: ["inspections:read", "inspections:create"],
  },
  "audit-log": {
    orgTypes: ["AUTHORITY", "SUPER_ADMIN"],
    anyPermissions: ["audit:read"],
  },
  // Own-company profile/branding page for company tenants (never platform overseers).
  company: {
    orgTypes: ["FUEL_STATION", "SERVICE_PROVIDER"],
    // Not shown to fuel-station roles that have no company/team capability at all (e.g. a technician).
    orgTypePermissions: { FUEL_STATION: ["organizations.update", "organizations.read", "team.read", "users.read", "roles.read"] },
  },
  users: {
    orgTypes: ["FUEL_STATION","AUTHORITY","SERVICE_PROVIDER","SUPER_ADMIN", ],
    orgTypePermissions: { FUEL_STATION: ["users.read", "team.read"] },
  },
  "users/:id": {
    orgTypes: ["FUEL_STATION","AUTHORITY" ,"SERVICE_PROVIDER","SUPER_ADMIN", ],
    orgTypePermissions: { FUEL_STATION: ["users.read", "team.read"] },
  },
  roles: {
    orgTypes: ["FUEL_STATION","AUTHORITY" ,"SERVICE_PROVIDER", "SUPER_ADMIN", ],
    orgTypePermissions: { FUEL_STATION: ["roles.read"] },
  },
  "roles/create": {
    orgTypes: ["FUEL_STATION","AUTHORITY" ,"SERVICE_PROVIDER", "SUPER_ADMIN", ],
    orgTypePermissions: { FUEL_STATION: ["roles.create"] },
  },
  "roles/:id": {
    orgTypes: ["FUEL_STATION","AUTHORITY" ,"SERVICE_PROVIDER", "SUPER_ADMIN", ],
    orgTypePermissions: { FUEL_STATION: ["roles.read"] },
  },
  "roles/:id/edit": {
    orgTypes: [ "FUEL_STATION","AUTHORITY" ,"SERVICE_PROVIDER","SUPER_ADMIN",],
    orgTypePermissions: { FUEL_STATION: ["roles.update"] },
  },
  // Asset Management (Fuel Station only). The route rules only decide who SEES a page; every call is re-checked by the server.
  assets: {
    orgTypes: ["FUEL_STATION"],
    anyPermissions: ["assets.read"],
  },
  "assets/create": {
    orgTypes: ["FUEL_STATION"],
    anyPermissions: ["assets.create"],
  },
  "assets/:id": {
    orgTypes: ["FUEL_STATION"],
    anyPermissions: ["assets.read"],
  },
  "assets/:id/edit": {
    orgTypes: ["FUEL_STATION"],
    anyPermissions: ["assets.update"],
  },
  branches: {
    orgTypes: ["FUEL_STATION"],
    anyPermissions: ["branches.read", "stations.read"],
  },
  "branches/create": {
    orgTypes: ["FUEL_STATION"],
    anyPermissions: ["branches.create"],
  },
  "branches/:id": {
    orgTypes: ["FUEL_STATION"],
    anyPermissions: ["branches.read", "stations.read"],
  },
  "branches/:id/edit": {
    orgTypes: ["FUEL_STATION"],
    anyPermissions: ["branches.update"],
  },
  // Geography management is SUPER_ADMIN-only (the server enforces the same on every write).
  locations: {
    orgTypes: ["SUPER_ADMIN"],
  },
  "service-offerings": {
    orgTypes: ["SERVICE_PROVIDER"],
  },
  operators: {
    orgTypes: ["SERVICE_PROVIDER"],
    anyPermissions: ["operators.read", "operators.create", "operators.update"],
  },
  "service-categories": {
    orgTypes: ["SERVICE_PROVIDER", "AUTHORITY", "SUPER_ADMIN"],
  },
  quotations: {
    orgTypes: ["SERVICE_PROVIDER", "FUEL_STATION", "AUTHORITY", "SUPER_ADMIN"],
    anyPermissions: ["quotations:read", "quotations:submit"],
  },
  "quotations/:id": {
    orgTypes: ["SERVICE_PROVIDER", "FUEL_STATION", "AUTHORITY", "SUPER_ADMIN"],
    anyPermissions: ["quotations:read", "quotations:submit"],
  },
  "job-orders": {
    orgTypes: ["AUTHORITY", "SUPER_ADMIN"],
    anyPermissions: ["job-orders:read"],
  },
  "job-orders/:id": {
    orgTypes: ["AUTHORITY", "SUPER_ADMIN"],
    anyPermissions: ["job-orders:read"],
  },
  "external-job-orders": {
    orgTypes: ["AUTHORITY", "SUPER_ADMIN"],
    anyPermissions: ["organizations:read"],
  },
  "external-job-orders/:id": {
    orgTypes: ["AUTHORITY", "SUPER_ADMIN"],
    anyPermissions: ["organizations:read"],
  },
  "work-orders/:id": {
    orgTypes: ["FUEL_STATION"],
    anyPermissions: ["workorders.read"],
  },
  "work-orders/review-queue": {
    orgTypes: ["FUEL_STATION"],
    anyPermissions: ["workorders.approve", "internal_tasks.review"],
  },
  "branch-requests": {
    orgTypes: ["FUEL_STATION", "SUPER_ADMIN"],
    orgTypePermissions: { FUEL_STATION: ["branch_requests.read", "branch_requests.create"] },
  },
  "branch-requests/create": {
    orgTypes: ["FUEL_STATION"],
    anyPermissions: ["branch_requests.create"],
  },
  "branch-requests/:id": {
    orgTypes: ["FUEL_STATION", "AUTHORITY", "SUPER_ADMIN"],
  },
  // Technician flows (the same capabilities the mobile app's "My tasks" / "Warehouse requests" use).
  "my-tasks": {
    orgTypes: ["FUEL_STATION"],
    anyPermissions: ["internal_tasks.update_status"],
  },
  "warehouse-requests": {
    orgTypes: ["FUEL_STATION"],
    anyPermissions: ["warehouse_orders.read"],
  },
  "warehouse-requests/:id": {
    orgTypes: ["FUEL_STATION"],
    anyPermissions: ["warehouse_orders.read"],
  },
  // Stock per warehouse. Reads need warehouse.read; a person delegated "add inventory items" may open it too.
  "warehouse-inventory": {
    orgTypes: ["FUEL_STATION"],
    anyPermissions: ["warehouse.read", "warehouse_items.create"],
  },
  // Station (Fuel Station): internal work orders, external requests
  "internal-work-orders": {
    orgTypes: ["FUEL_STATION"],
    anyPermissions: ["internal_work_orders.read"],
    excludeExecutorOnly: true,
  },
  "internal-work-orders/review-queue": {
    orgTypes: ["FUEL_STATION"],
    anyPermissions: ["internal_work_orders.review"],
  },
  "internal-work-orders/:id": {
    orgTypes: ["FUEL_STATION"],
    anyPermissions: ["internal_work_orders.read"],
    excludeExecutorOnly: true,
  },
  // One task (details, progress, attachments, activity, execution and review). Reachable from My tasks and
  // from the order page. The server still enforces assignee / permission / station on every call.
  "internal-tasks/:id": {
    orgTypes: ["FUEL_STATION"],
    anyPermissions: ["internal_tasks.read"],
  },
  // Maintenance reports (بلاغات = /api/maintenance-issues). Read gates the list/details; create gates the form.
  "maintenance-reports": {
    orgTypes: ["FUEL_STATION"],
    anyPermissions: ["maintenance_issues.read"],
  },
  "maintenance-reports/create": {
    orgTypes: ["FUEL_STATION"],
    anyPermissions: ["maintenance_issues.create"],
  },
  "maintenance-reports/:id": {
    orgTypes: ["FUEL_STATION"],
    anyPermissions: ["maintenance_issues.read"],
  },
  "station-requests": {
    orgTypes: ["FUEL_STATION"],
    anyPermissions: ["station.requests.read"],
  },
  "station-requests/create": {
    orgTypes: ["FUEL_STATION"],
    anyPermissions: ["station.maintenance_requests.create", "external_maintenance_v2.create"],
  },
  "station-requests/:id": {
    orgTypes: ["FUEL_STATION"],
    anyPermissions: ["station.requests.read"],
  },
  "linked-providers": {
    orgTypes: ["FUEL_STATION"],
    anyPermissions: ["station.linked_providers.read", "station.requests.read", "station.requests.send_to_providers", "proposals.read"],
  },
  "station-job-orders": {
    orgTypes: ["FUEL_STATION"],
    anyPermissions: ["station.job_orders.read", "station.job_orders.review", "station.requests.read", "station.job_orders.confirm_sent"],
  },
  "station-job-orders/:id": {
    orgTypes: ["FUEL_STATION"],
    anyPermissions: ["station.job_orders.read", "station.job_orders.review", "station.requests.read", "station.job_orders.confirm_sent"],
  },
  // Provider (Service Provider): RFQs, job orders
  "provider-rfqs": {
    orgTypes: ["SERVICE_PROVIDER"],
    anyPermissions: ["provider.rfqs.read"],
  },
  "provider-rfqs/:id": {
    orgTypes: ["SERVICE_PROVIDER"],
    anyPermissions: ["provider.rfqs.read"],
  },
  "provider-job-orders": {
    orgTypes: ["SERVICE_PROVIDER"],
    anyPermissions: ["provider.job_orders.read"],
  },
  "provider-job-orders/:id": {
    orgTypes: ["SERVICE_PROVIDER"],
    anyPermissions: ["provider.job_orders.read"],
  },
};

export const normalizePathKey = (path: string) => path.replace(/^\/+/, "");

export const canAccessByRule = (
  rule: AccessRule | undefined,
  organizationType: OrgType | undefined,
  permissions: string[]
) => {
  if (!rule) return true;
  if (rule.orgTypes?.length) {
    if (!organizationType || !rule.orgTypes.includes(organizationType)) return false;
  }

  // Permission checks are enforced whenever permissions are known. A company session (Fuel Station / Service
  // Provider) with NO permissions is a Job Title with no capabilities (or a session whose permissions could not be
  // loaded): it fails closed on every permission-gated page instead of falling back to org-type gating. Only the
  // platform tenants (Authority / Super Admin) keep the org-type fallback.
  // Codes are compared in their canonical dot form (see normalizePermissionCode) so the
  // legacy colon-style rule keys match the backend's dot-style permission keys.
  const granted = new Set(permissions.map(normalizePermissionCode));
  const companySession = organizationType === "FUEL_STATION" || organizationType === "SERVICE_PROVIDER";
  const permissionGated =
    !!rule.anyPermissions?.length || !!rule.allPermissions?.length || !!(organizationType && rule.orgTypePermissions?.[organizationType]?.length);
  if (companySession && granted.size === 0 && permissionGated) return false;
  if (granted.size > 0 && rule.anyPermissions?.length) {
    const allowed = rule.anyPermissions.some((code) => granted.has(normalizePermissionCode(code)));
    if (!allowed) return false;
  }
  const perOrg = organizationType ? rule.orgTypePermissions?.[organizationType] : undefined;
  if (granted.size > 0 && perOrg?.length) {
    const allowed = perOrg.some((code) => granted.has(normalizePermissionCode(code)));
    if (!allowed) return false;
  }
  if (granted.size > 0 && rule.excludeExecutorOnly && isExecutorOnly(permissions)) return false;
  if (granted.size > 0 && rule.allPermissions?.length) {
    const allowed = rule.allPermissions.every((code) => granted.has(normalizePermissionCode(code)));
    if (!allowed) return false;
  }
  return true;
};

/**
 * Whether `pathname` may be opened by the given session, using the SAME rules the route guard
 * applies. Paths with no rule are allowed (the guard allows them too). When several rule keys
 * match (e.g. "organizations/new" and "organizations/:id"), the most specific — fewest dynamic
 * segments — wins, mirroring how the router itself resolves them.
 */
export const canAccessPath = (
  pathname: string,
  organizationType: OrgType | undefined,
  permissions: string[]
): boolean => {
  const clean = pathname.split(/[?#]/)[0] || "/";
  let best: { key: string; dynamic: number } | null = null;
  for (const key of Object.keys(ROUTE_ACCESS_RULES)) {
    if (!matchPath({ path: `/${key}`, end: true }, clean)) continue;
    const dynamic = (key.match(/:/g) ?? []).length;
    if (!best || dynamic < best.dynamic) best = { key, dynamic };
  }
  if (!best) return true;
  return canAccessByRule(ROUTE_ACCESS_RULES[best.key], organizationType, permissions);
};

/**
 * Where to send a user right after a successful sign-in. A remembered location (the page that
 * bounced them to /login) is honoured only if THIS user is allowed to open it: it may have been
 * remembered by a previous user, or by a role with wider access, and replaying it for a narrower
 * role is exactly how a fresh sign-in used to land on "Access Denied".
 */
export const resolvePostLoginPath = (
  remembered: { pathname?: string; search?: string } | null | undefined,
  organizationType: OrgType | undefined,
  permissions: string[],
  homePath: string
): string => {
  const pathname = remembered?.pathname;
  if (!pathname || pathname === "/" || pathname === "/login" || pathname === "/register") return homePath;
  if (!canAccessPath(pathname, organizationType, permissions)) return homePath;
  return `${pathname}${remembered?.search ?? ""}`;
};
