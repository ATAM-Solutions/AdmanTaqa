export interface StationDashboardKpis {
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

export interface StationDashboardCharts {
  requestsOverTime: { date: string; count: number }[];
  internalVsExternal: { internal: number; external: number };
  jobsByStatus: { status: string; count: number }[];
  branchActivity: { branchId: number; branchName: string; count: number }[];
  providerUsage: { organizationId: number; organizationName: string; count: number }[];
}

export interface StationDashboardOrganization {
  id: number;
  name: string;
  nameAr: string | null;
  type: string;
  status: string;
  logoUrl: string | null;
  isActive: boolean;
  email: string | null;
  phone: string | null;
}

export interface StationDashboardRecentStation {
  id: number;
  nameEn: string;
  nameAr: string;
  licenseNumber: string | null;
  status: string;
  isActive: boolean;
  address: string | null;
  createdAt: string;
  Area?: { id: number; name: string } | null;
}

export interface StationDashboardActivityItem {
  kind: "INTERNAL_WORK_ORDER" | "EXTERNAL_REQUEST";
  id: number;
  title: string | null;
  titleAr?: string | null;
  status: string;
  priority?: string | null;
  branch: { id: number; nameEn: string; nameAr: string } | null;
  createdAt: string;
}

export interface StationDashboardData {
  kpis: StationDashboardKpis;
  charts: StationDashboardCharts;
  organization?: StationDashboardOrganization | null;
  recentStations?: StationDashboardRecentStation[];
  recentActivity?: StationDashboardActivityItem[];
}

export interface StationDashboardResponse {
  success: boolean;
  data: StationDashboardData;
}
