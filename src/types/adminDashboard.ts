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

export interface AdminDashboardData {
  kpis: AdminDashboardKpis;
  charts: AdminDashboardCharts;
}

export interface AdminDashboardResponse {
  success: boolean;
  data: AdminDashboardData;
  message?: string;
}
