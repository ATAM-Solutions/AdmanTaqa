/**
 * SUPER_ADMIN company management — /api/admin/organizations/*
 */

/** City with its region (Governorate table == region/منطقة). */
export interface GeoCity {
  id: number;
  name: string;
  nameAr?: string | null;
  governorateId?: number;
  Governorate?: { id: number; name: string; nameAr?: string | null } | null;
}

export type AdminOrganizationType = "FUEL_STATION" | "SERVICE_PROVIDER";
export type OrganizationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface AdminOrganization {
  id: number;
  name: string;
  nameAr: string | null;
  type: AdminOrganizationType;
  status: OrganizationStatus;
  rejectionReason: string | null;
  approvedAt: string | null;
  approvedByUserId: number | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  cityId: number | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  City?: GeoCity | null;
  /** Present on list rows and detail. */
  stationsCount?: number;
  usersCount?: number;
}

export interface AdminOrganizationDocument {
  id: number;
  organizationId: number;
  documentType: string;
  fileUrl: string | null;
  fileName: string | null;
  status?: string;
  expiresAt?: string | null;
  createdAt: string;
}

export interface AdminOrganizationApproval {
  id: number;
  decision: "APPROVED" | "REJECTED";
  reason: string | null;
  createdAt: string;
  User?: { id: number; fullName: string; email: string } | null;
}

/** Same KPI shape the Fuel Station company dashboard uses (FUEL_STATION only). */
export interface AdminOrganizationSummary {
  branches: number;
  employees: number;
  openMaintenanceIssues: number;
  internalWorkOrders: { total: number; open: number };
  externalRequests: { total: number; open: number };
  quotesAwaitingDecision: number;
  activeJobs: number;
  awaitingPayment: number;
  completedAwaitingApproval: number;
  completedJobs: number;
}

export interface AdminOrganizationDetail extends AdminOrganization {
  registrationNumber: string | null;
  approvedBy: { id: number; fullName: string; email: string } | null;
  activeUsersCount: number;
  activeStationsCount: number;
  FuelStationProfile?: { id: number; registrationNumber: string | null } | null;
  ServiceProviderProfile?: {
    id: number;
    licenseNumber: string | null;
    yearsExperience: number | null;
    street: string | null;
    Area?: { id: number; name: string } | null;
    City?: { id: number; name: string } | null;
  } | null;
  OrganizationDocuments: AdminOrganizationDocument[];
  OrganizationApprovals: AdminOrganizationApproval[];
  summary: AdminOrganizationSummary | null;
}

export interface AdminOrganizationsListParams {
  type?: AdminOrganizationType;
  status?: OrganizationStatus;
  isActive?: boolean;
  q?: string;
  page?: number;
  limit?: number;
}

export interface AdminOrganizationsListData {
  items: AdminOrganization[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateAdminOrganizationBody {
  name: string;
  nameAr?: string | null;
  type: AdminOrganizationType;
  status?: OrganizationStatus;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  cityId?: number | null;
  /** Validation-only: must be the parent region of `cityId`. */
  regionId?: number | null;
  registrationNumber?: string | null;
}

export interface UpdateAdminOrganizationBody {
  name?: string;
  nameAr?: string | null;
  status?: OrganizationStatus;
  isActive?: boolean;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  cityId?: number | null;
  regionId?: number | null;
  registrationNumber?: string | null;
  rejectionReason?: string | null;
}

// ── Stations ────────────────────────────────────────────────────────────────
export type StationStatus = "APPROVED" | "SUSPENDED" | "PENDING";

export interface AdminStation {
  id: number;
  organizationId: number;
  areaId: number;
  nameEn: string;
  nameAr: string;
  licenseNumber: string | null;
  stationTypeId: number | null;
  street: string | null;
  address: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  workingHours: Record<string, { open?: string; close?: string }> | null;
  ownerName: string | null;
  ownerEmail: string | null;
  managerName: string | null;
  managerEmail: string | null;
  managerPhone: string | null;
  managerUserId: number | null;
  /** Linked user who is the DESIGNATED manager (null when none). Distinct from users who merely have access. */
  manager?: { id: number; fullName: string; email?: string | null; phone?: string | null; isActive: boolean } | null;
  /** 'USER' = linked account; 'LEGACY_TEXT' = only a hand-typed name; null = no manager. */
  managerSource?: "USER" | "LEGACY_TEXT" | null;
  /** Stored hand-typed values (only present when a linked manager overlays managerName/Email/Phone). */
  legacyManagerName?: string | null;
  legacyManagerEmail?: string | null;
  legacyManagerPhone?: string | null;
  /** Users with ACCESS to this station (identity only; single-station GET only). */
  assignedUsers?: { id: number; fullName: string; isActive: boolean }[];
  status: StationStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  Area?: { id: number; name: string; nameAr?: string | null; code?: string | null; cityId?: number; City?: GeoCity | null } | null;
  FuelStationType?: { id: number; name: string; code?: string } | null;
  FuelTypes?: { id: number; name: string; code?: string }[];
}

export interface CreateAdminStationBody {
  nameEn: string;
  nameAr: string;
  licenseNumber?: string | null;
  stationTypeId?: number | null;
  /** Region (منطقة) and city (مدينة): required on create, validated against `areaId`'s parents by the server. */
  regionId?: number;
  cityId?: number;
  /** District (حي) — the persisted link. */
  areaId: number;
  street?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  managerName?: string | null;
  managerEmail?: string | null;
  managerPhone?: string | null;
  fuelTypeIds?: number[];
  /** Retired (legacy) fuel types currently linked that the admin explicitly unchecked. */
  releaseFuelTypeIds?: number[];
  status?: StationStatus;
  isActive?: boolean;
}

/** Eligible station manager (active, same company, Station Manager role). */
export interface ManagerCandidate {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
}

export type UpdateAdminStationBody = Partial<CreateAdminStationBody> & {
  /** Designate (id) or clear (null) the station's linked manager. Never changes anyone's access. */
  managerUserId?: number | null;
};

// ── Roles + Users ───────────────────────────────────────────────────────────
export interface AdminAssignableRole {
  id: number;
  name: string;
  description: string | null;
  organizationId: number | null;
  organizationType: string;
  isSystem: boolean;
  /** "Station Owner" / "Provider Owner" — the company's full-authority admin role. */
  isCompanyAdmin: boolean;
}

// ── Asset-creation policy (Super Admin, Fuel Station only) ──────────────────
/** One role of the company as the backend reports it. `eligible` is the backend's own verdict — never recompute it. */
export interface AssetPolicyRole {
  id: number;
  name: string;
  /** A shared system role (not owned by this company). */
  isSystem: boolean;
  /** "Station Owner" — the company's full-authority administrator role. */
  isCompanyAdmin: boolean;
  /** The role itself currently grants the Create Assets permission. */
  holdsAssetCreate: boolean;
  eligible: boolean;
}

/** GET/PUT /admin/organizations/:id/asset-policy */
export interface AdminAssetPolicy {
  organizationId: number;
  organizationType: string;
  restricted: boolean;
  allowedRoleNames: string[];
  /** Saved entries whose role no longer exists; dropped by the next save. */
  staleRoleNames: string[];
  staleRoleIds: number[];
  hasPolicy: boolean;
  roles: AssetPolicyRole[];
  updatedAt: string | null;
  updatedByUserId: number | null;
}

export interface SetAssetPolicyBody {
  restricted: boolean;
  allowedRoleNames: string[];
}

export interface AdminUserRole {
  id: number;
  name: string;
  isCompanyAdmin: boolean;
}

export interface AdminUser {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  isActive: boolean;
  organizationId: number;
  createdAt: string;
  updatedAt: string;
  roles: AdminUserRole[];
}

export interface CreateAdminUserBody {
  fullName: string;
  email: string;
  phone?: string | null;
  password: string;
  roleId: number;
  isActive?: boolean;
}

export interface UpdateAdminUserBody {
  fullName?: string;
  email?: string;
  phone?: string | null;
  roleId?: number;
  isActive?: boolean;
}

// ── Activity ────────────────────────────────────────────────────────────────
export interface AdminActivityItem {
  id: number;
  userId: number | null;
  organizationId: number | null;
  branchId: number | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  User?: { id: number; fullName: string; email: string } | null;
  Branch?: { id: number; nameEn: string; nameAr: string } | null;
}

export interface AdminActivityListData {
  items: AdminActivityItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ── Job Title permission policy (Super Admin, Fuel Station and Service Provider companies) ─────────────────
export type PermissionDecisionKind = "formal_decision" | "direct_request" | null;

/** One governable permission as the backend reports it. `eligibleRoleNames === null` = platform default (every Job Title). */
export interface PolicyPermission {
  code: string;
  /** `asset_policy` permissions are edited in the Asset permissions tab, not here. */
  managedBy: "permission_policy" | "asset_policy";
  /** `closed`: a per-person grant is impossible until Super Admin makes the Job Title eligible. */
  grantDefault: "open" | "closed";
  decisionKind: PermissionDecisionKind;
  /** Approvals and commercial writes: withheld whenever the policy cannot be read. */
  sensitive: boolean;
  restricted: boolean;
  eligibleRoleNames: string[] | null;
  /** Job Titles whose own role grants it today. */
  holdingRoleNames: string[];
}

export interface PolicyModule {
  id: string;
  permissions: PolicyPermission[];
}

export interface PolicyRole {
  id: number;
  name: string;
  isSystem: boolean;
  /** Always eligible; cannot be restricted out of its own company. */
  isCompanyAdmin: boolean;
}

/** GET/PUT /admin/organizations/:id/permission-policy */
export interface AdminPermissionPolicy {
  organizationId: number;
  organizationType: string;
  roles: PolicyRole[];
  modules: PolicyModule[];
  /** People of the company who hold no Job Title (identified only, never assigned automatically). */
  usersWithoutJobTitle: number;
}

export interface PermissionPolicyEntry {
  code: string;
  restricted: boolean;
  allowedRoleNames: string[];
}
export interface SetPermissionPolicyBody {
  policies: PermissionPolicyEntry[];
}
