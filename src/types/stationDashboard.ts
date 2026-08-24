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

export interface StationDashboardData {
  kpis: StationDashboardKpis;
  charts: StationDashboardCharts;
}

export interface StationDashboardResponse {
  success: boolean;
  data: StationDashboardData;
}
