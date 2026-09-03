/**
 * SUPER_ADMIN company management — /api/admin/organizations/*
 */

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
  City?: { id: number; name: string } | null;
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
  status: StationStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  Area?: { id: number; name: string; code?: string | null; cityId?: number; City?: { id: number; name: string } | null } | null;
  FuelStationType?: { id: number; name: string; code?: string } | null;
  FuelTypes?: { id: number; name: string; code?: string }[];
}

export interface CreateAdminStationBody {
  nameEn: string;
  nameAr: string;
  licenseNumber?: string | null;
  stationTypeId?: number | null;
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
  status?: StationStatus;
  isActive?: boolean;
}

export type UpdateAdminStationBody = Partial<CreateAdminStationBody>;

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
