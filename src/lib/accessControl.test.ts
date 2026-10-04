import { describe, expect, it } from "vitest";
import {
  canAccessByRule,
  canAccessPath,
  normalizePathKey,
  resolvePostLoginPath,
  ROUTE_ACCESS_RULES,
} from "./accessControl";

describe("normalizePathKey", () => {
  it("strips a single leading slash", () => {
    expect(normalizePathKey("/organizations")).toBe("organizations");
  });

  it("strips multiple leading slashes", () => {
    expect(normalizePathKey("//organizations")).toBe("organizations");
  });

  it("leaves a path with no leading slash unchanged", () => {
    expect(normalizePathKey("organizations/:id")).toBe("organizations/:id");
  });
});

describe("canAccessByRule", () => {
  it("allows access when no rule exists for the route", () => {
    expect(canAccessByRule(undefined, "FUEL_STATION", [])).toBe(true);
  });

  it("denies access when org type is missing but the rule requires one", () => {
    const rule = ROUTE_ACCESS_RULES["organizations"];
    expect(canAccessByRule(rule, undefined, [])).toBe(false);
  });

  it("denies access when org type is not in the rule's allow-list", () => {
    const rule = ROUTE_ACCESS_RULES["organizations"];
    expect(canAccessByRule(rule, "FUEL_STATION", [])).toBe(false);
  });

  it("allows access on org-type match when the backend returned no permissions", () => {
    const rule = ROUTE_ACCESS_RULES["organizations"];
    expect(canAccessByRule(rule, "AUTHORITY", [])).toBe(true);
  });

  it("enforces anyPermissions once permissions are loaded", () => {
    const rule = ROUTE_ACCESS_RULES["organizations"];
    expect(canAccessByRule(rule, "AUTHORITY", ["unrelated:permission"])).toBe(false);
    expect(canAccessByRule(rule, "AUTHORITY", ["organizations:read"])).toBe(true);
  });

  it("enforces allPermissions requiring every listed code", () => {
    const rule = { allPermissions: ["a:read", "a:write"] };
    expect(canAccessByRule(rule, undefined, ["a:read"])).toBe(false);
    expect(canAccessByRule(rule, undefined, ["a:read", "a:write"])).toBe(true);
  });

  it("allows a route with no orgTypes restriction regardless of org type", () => {
    const rule = ROUTE_ACCESS_RULES["quotations"];
    expect(canAccessByRule(rule, "SERVICE_PROVIDER", [])).toBe(true);
    expect(canAccessByRule(rule, "FUEL_STATION", [])).toBe(true);
    expect(canAccessByRule(rule, "AUTHORITY", [])).toBe(false);
  });
});

describe("SUPER_ADMIN company management routes", () => {
  it("allows only SUPER_ADMIN into the Add Company wizard", () => {
    const rule = ROUTE_ACCESS_RULES["organizations/new"];
    expect(canAccessByRule(rule, "SUPER_ADMIN", [])).toBe(true);
    expect(canAccessByRule(rule, "AUTHORITY", ["organizations:read"])).toBe(false);
    expect(canAccessByRule(rule, "FUEL_STATION", [])).toBe(false);
    expect(canAccessByRule(rule, "SERVICE_PROVIDER", [])).toBe(false);
  });

  it("keeps the organizations list + detail available to SUPER_ADMIN and AUTHORITY only", () => {
    for (const key of ["organizations", "organizations/:id"]) {
      const rule = ROUTE_ACCESS_RULES[key];
      expect(canAccessByRule(rule, "SUPER_ADMIN", ["organizations:read"])).toBe(true);
      expect(canAccessByRule(rule, "AUTHORITY", ["organizations:read"])).toBe(true);
      expect(canAccessByRule(rule, "FUEL_STATION", ["organizations:read"])).toBe(false);
    }
  });

  it("exposes the company profile page to company tenants only", () => {
    const rule = ROUTE_ACCESS_RULES["company"];
    expect(canAccessByRule(rule, "FUEL_STATION", [])).toBe(true);
    expect(canAccessByRule(rule, "SERVICE_PROVIDER", [])).toBe(true);
    expect(canAccessByRule(rule, "SUPER_ADMIN", [])).toBe(false);
    expect(canAccessByRule(rule, "AUTHORITY", [])).toBe(false);
  });

  it("gives every company type and SUPER_ADMIN a dashboard, but not AUTHORITY", () => {
    const rule = ROUTE_ACCESS_RULES["dashboard"];
    expect(canAccessByRule(rule, "SUPER_ADMIN", [])).toBe(true);
    expect(canAccessByRule(rule, "FUEL_STATION", [])).toBe(true);
    expect(canAccessByRule(rule, "AUTHORITY", [])).toBe(false);
  });
});

describe("permission code normalization", () => {
  it("accepts the backend's dot-style keys for colon-style route rules", () => {
    const rule = ROUTE_ACCESS_RULES["organizations"];
    expect(canAccessByRule(rule, "SUPER_ADMIN", ["organizations.read"])).toBe(true);
    expect(canAccessByRule(ROUTE_ACCESS_RULES["job-orders"], "SUPER_ADMIN", ["job_orders.read"])).toBe(true);
    expect(canAccessByRule(rule, "SUPER_ADMIN", ["stations.read"])).toBe(false);
  });
});

// Permissions of the Maintenance Manager role (no quotations.read) vs. a Station Manager (has it).
const MAINTENANCE_MANAGER_PERMS = ["maintenance_issues.read", "maintenance_issues.decide", "stations.read"];
const STATION_MANAGER_PERMS = [...MAINTENANCE_MANAGER_PERMS, "quotations.read"];

describe("canAccessPath", () => {
  it("applies the same rules the route guard uses, including dynamic segments", () => {
    expect(canAccessPath("/quotations", "FUEL_STATION", MAINTENANCE_MANAGER_PERMS)).toBe(false);
    expect(canAccessPath("/quotations/42", "FUEL_STATION", MAINTENANCE_MANAGER_PERMS)).toBe(false);
    expect(canAccessPath("/quotations", "FUEL_STATION", STATION_MANAGER_PERMS)).toBe(true);
    expect(canAccessPath("/organizations", "FUEL_STATION", STATION_MANAGER_PERMS)).toBe(false);
  });

  it("prefers the most specific rule (organizations/new over organizations/:id)", () => {
    expect(canAccessPath("/organizations/new", "SUPER_ADMIN", [])).toBe(true);
    expect(canAccessPath("/organizations/new", "AUTHORITY", ["organizations.read"])).toBe(false);
  });

  it("allows paths that have no rule, and ignores the query string", () => {
    expect(canAccessPath("/notifications", "FUEL_STATION", [])).toBe(true);
    expect(canAccessPath("/quotations?tab=open", "FUEL_STATION", MAINTENANCE_MANAGER_PERMS)).toBe(false);
  });
});

describe("resolvePostLoginPath", () => {
  const home = "/dashboard";

  it("replays a remembered page only when THIS user may open it", () => {
    // a Station Manager was on /quotations; a Maintenance Manager signs in next in the same browser
    const remembered = { pathname: "/quotations", search: "" };
    expect(resolvePostLoginPath(remembered, "FUEL_STATION", MAINTENANCE_MANAGER_PERMS, home)).toBe(home);
    expect(resolvePostLoginPath(remembered, "FUEL_STATION", STATION_MANAGER_PERMS, home)).toBe("/quotations");
  });

  it("keeps the query string of an allowed page", () => {
    expect(
      resolvePostLoginPath({ pathname: "/station-requests", search: "?status=OPEN" }, "FUEL_STATION", [], home)
    ).toBe("/station-requests?status=OPEN");
  });

  it("falls back to home when nothing (or nothing useful) was remembered", () => {
    expect(resolvePostLoginPath(undefined, "FUEL_STATION", [], home)).toBe(home);
    expect(resolvePostLoginPath({ pathname: "/" }, "FUEL_STATION", [], home)).toBe(home);
    expect(resolvePostLoginPath({ pathname: "/login" }, "FUEL_STATION", [], home)).toBe(home);
  });
});
