import { describe, expect, it } from "vitest";
import { canAccessByRule, normalizePathKey, ROUTE_ACCESS_RULES } from "./accessControl";

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
