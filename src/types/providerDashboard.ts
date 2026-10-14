/** `null` = that data source failed (shown as "unavailable"), never a fabricated 0. */
export interface ProviderDashboardKpis {
  employees: number | null;
  operators: number | null;
  services: number | null;
  incomingRequests: { total: number | null; open: number | null };
  awaitingMyQuote: number | null;
  draftQuotes: number | null;
  quotesSubmitted: number | null;
  acceptedQuotes: number | null;
  activeJobs: number | null;
  awaitingPaymentReceipt: number | null;
  activeVisits: number | null;
  awaitingCompletionReport: number | null;
  completedJobs: number | null;
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
  sources?: Record<string, { available: boolean; reason?: string }>;
  /** Figures the platform does not hold (revenue, response time, ratings) — documented, never invented. */
  unavailable?: string[];
}

export interface ProviderDashboardResponse {
  success: boolean;
  data: ProviderDashboardData;
}
