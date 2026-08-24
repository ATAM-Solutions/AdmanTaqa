export interface ProviderDashboardKpis {
  employees: number;
  operators: number;
  services: number;
  incomingRequests: { total: number; open: number };
  quotesSubmitted: number;
  acceptedQuotes: number;
  activeJobs: number;
  awaitingPaymentReceipt: number;
  activeVisits: number;
  awaitingCompletionReport: number;
  completedJobs: number;
}

export interface ProviderDashboardCharts {
  requestsReceivedOverTime: { date: string; count: number }[];
  quoteConversion: { submitted: number; accepted: number };
  jobsByStatus: { status: string; count: number }[];
  quotesByStatus: { status: string; count: number }[];
}

export interface ProviderDashboardData {
  kpis: ProviderDashboardKpis;
  charts: ProviderDashboardCharts;
}

export interface ProviderDashboardResponse {
  success: boolean;
  data: ProviderDashboardData;
}
