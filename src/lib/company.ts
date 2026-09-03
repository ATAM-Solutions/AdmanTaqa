import type { AuthRole, Organization } from "@/types/auth";

/** Role names that mean "full-authority company admin" per organization type. */
export const COMPANY_ADMIN_ROLE_NAMES: Record<string, string> = {
  FUEL_STATION: "Station Owner",
  SERVICE_PROVIDER: "Provider Owner",
};

export const COMPANY_ORG_TYPES = ["FUEL_STATION", "SERVICE_PROVIDER"] as const;

export function isCompanyOrganization(type: string | undefined | null): boolean {
  return type === "FUEL_STATION" || type === "SERVICE_PROVIDER";
}

/** Display name for an organization in the active UI language (Arabic name when available). */
export function getOrganizationDisplayName(
  org: { name: string; nameAr?: string | null } | null | undefined,
  language: string
): string {
  if (!org) return "";
  if (language.startsWith("ar") && org.nameAr) return org.nameAr;
  return org.name;
}

/** Two-letter initials used when a company has no logo. */
export function getInitials(name: string | null | undefined): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function isCompanyAdminRole(roleName: string | undefined, orgType: string | undefined): boolean {
  if (!roleName || !orgType) return false;
  return COMPANY_ADMIN_ROLE_NAMES[orgType] === roleName;
}

/** True when the signed-in user holds the company-admin role of their organization. */
export function hasCompanyAdminRole(roles: AuthRole[], organization: Organization | null): boolean {
  if (!organization) return false;
  return roles.some((r) => isCompanyAdminRole(r.name, organization.type));
}
