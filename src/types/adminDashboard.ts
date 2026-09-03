export interface PeriodCounts {
  today: number;
  last7d: number;
  last30d: number;
}

export interface AdminDashboardKpis {
  totalOrganizations: number;
  totalFuelStations: number;
  totalServiceProviders: number;
  totalActiveUsers: number;
  /** All stations (branches) across every company. */
  totalStations: number;
  /** All users across every company (platform-admin users excluded). */
  totalUsers: number;
  pendingRegistrations: number;
  newRegistrationsPeriod: PeriodCounts;
  pendingBranchApprovals: number;
  openMaintenanceIssues: number;
  internalWorkOrders: { total: number; open: number };
  externalRequests: { total: number; open: number; legacyV1Total: number };
  activeJobOrders: { jobOrders: number; externalJobOrders: number; total: number };
  completedJobs: { jobOrders: number; externalJobOrders: number; total: number };
  pendingQuotations: { v1: number; v2: number; total: number };
  awaitingPaymentConfirmation: { jobOrders: number; externalJobOrders: number; total: number };
  recentSiteVisits7d: { jobVisits: number; externalJobVisits: number; total: number };
  stuckWorkflows: {
    note: string;
    jobOrders: number;
    externalJobOrders: number;
    externalRequests: number;
    total: number;
  };
}

export interface JobsByStatusRow {
  status: string;
  jobOrders: number;
  externalJobOrders: number;
  total: number;
}

export interface DailyCountRow {
  date: string;
  external: number;
  legacyV1: number;
  total: number;
}

export interface JobCompletionTrendRow {
  date: string;
  completed: number;
}

export interface OrgActivityRow {
  organizationId: number;
  organizationName: string;
  count: number;
}

export interface AdminDashboardCharts {
  jobsByStatus: JobsByStatusRow[];
  organizationsByType: Record<string, number>;
  registrationsByStatus: Record<string, number>;
  requestsOverTime: DailyCountRow[];
  internalVsExternal: { internal: number; external: number };
  jobCompletionTrend: JobCompletionTrendRow[];
  serviceProviderActivity: OrgActivityRow[];
  fuelStationActivity: OrgActivityRow[];
}

export interface AdminDashboardRecentOrganization {
  id: number;
  name: string;
  nameAr: string | null;
  type: "FUEL_STATION" | "SERVICE_PROVIDER";
  status: "PENDING" | "APPROVED" | "REJECTED";
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AdminDashboardRecentUser {
  id: number;
  fullName: string;
  email: string;
  isActive: boolean;
  organizationId: number;
  organizationName: string | null;
  organizationType: string | null;
  createdAt: string;
}

export interface AdminDashboardRecent {
  organizations: AdminDashboardRecentOrganization[];
  users: AdminDashboardRecentUser[];
  registrations: AdminDashboardRecentOrganization[];
}

export interface AdminDashboardData {
  kpis: AdminDashboardKpis;
  charts: AdminDashboardCharts;
  recent?: AdminDashboardRecent;
}

export interface AdminDashboardResponse {
  success: boolean;
  data: AdminDashboardData;
  message?: string;
}
