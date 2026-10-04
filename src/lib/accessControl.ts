import type { Organization } from "@/types/auth";
import { matchPath } from "react-router-dom";
import { normalizePermissionCode } from "@/lib/permissions";

export type OrgType = Organization["type"];

export type AccessRule = {
  orgTypes?: OrgType[];
  anyPermissions?: string[];
  allPermissions?: string[];
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
  },
  users: {
    orgTypes: ["FUEL_STATION","AUTHORITY","SERVICE_PROVIDER","SUPER_ADMIN", ],
  },
  "users/:id": {
    orgTypes: ["FUEL_STATION","AUTHORITY" ,"SERVICE_PROVIDER","SUPER_ADMIN", ],
  },
  roles: {
    orgTypes: ["FUEL_STATION","AUTHORITY" ,"SERVICE_PROVIDER", "SUPER_ADMIN", ],
  },
  "roles/create": {
    orgTypes: ["FUEL_STATION","AUTHORITY" ,"SERVICE_PROVIDER", "SUPER_ADMIN", ],
  },
  "roles/:id": {
    orgTypes: ["FUEL_STATION","AUTHORITY" ,"SERVICE_PROVIDER", "SUPER_ADMIN", ],
  },
  "roles/:id/edit": {
    orgTypes: [ "FUEL_STATION","AUTHORITY" ,"SERVICE_PROVIDER","SUPER_ADMIN",],
  },
  branches: {
    orgTypes: ["FUEL_STATION"],
  },
  "branches/create": {
    orgTypes: ["FUEL_STATION"],
  },
  "branches/:id": {
    orgTypes: ["FUEL_STATION"],
  },
  "branches/:id/edit": {
    orgTypes: ["FUEL_STATION"],
  },
  locations: {
    orgTypes: ["AUTHORITY",  "FUEL_STATION", "SUPER_ADMIN"],
  },
  "service-offerings": {
    orgTypes: ["SERVICE_PROVIDER"],
  },
  operators: {
    orgTypes: ["SERVICE_PROVIDER"],
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
  },
  "branch-requests/create": {
    orgTypes: ["FUEL_STATION"],
  },
  "branch-requests/:id": {
    orgTypes: ["FUEL_STATION", "AUTHORITY", "SUPER_ADMIN"],
  },
  // Station (Fuel Station): internal work orders, external requests
  "internal-work-orders": {
    orgTypes: ["FUEL_STATION"],
  },
  "internal-work-orders/review-queue": {
    orgTypes: ["FUEL_STATION"],
  },
  "internal-work-orders/:id": {
    orgTypes: ["FUEL_STATION"],
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
  },
  "station-requests/create": {
    orgTypes: ["FUEL_STATION"],
  },
  "station-requests/:id": {
    orgTypes: ["FUEL_STATION"],
  },
  "linked-providers": {
    orgTypes: ["FUEL_STATION"],
  },
  "station-job-orders": {
    orgTypes: ["FUEL_STATION"],
  },
  "station-job-orders/:id": {
    orgTypes: ["FUEL_STATION"],
  },
  // Provider (Service Provider): RFQs, job orders
  "provider-rfqs": {
    orgTypes: ["SERVICE_PROVIDER"],
  },
  "provider-rfqs/:id": {
    orgTypes: ["SERVICE_PROVIDER"],
  },
  "provider-job-orders": {
    orgTypes: ["SERVICE_PROVIDER"],
  },
  "provider-job-orders/:id": {
    orgTypes: ["SERVICE_PROVIDER"],
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

  // If permissions were loaded, enforce permission checks.
  // If backend returns no permissions for a session, fall back to org-type gating.
  // Codes are compared in their canonical dot form (see normalizePermissionCode) so the
  // legacy colon-style rule keys match the backend's dot-style permission keys.
  const granted = new Set(permissions.map(normalizePermissionCode));
  if (granted.size > 0 && rule.anyPermissions?.length) {
    const allowed = rule.anyPermissions.some((code) => granted.has(normalizePermissionCode(code)));
    if (!allowed) return false;
  }
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
