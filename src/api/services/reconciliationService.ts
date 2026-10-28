import axiosInstance from "@/api/config";

export type ReconFlagCode =
  | "MIXED_PAYMENT_SYSTEMS" | "UNALLOCATED_VERIFIED_PAYMENT" | "PENDING_START_INSTALLMENT_AFTER_ACTIVATION"
  | "ACTIVATED_WITHOUT_VERIFIED_PAYMENT" | "REPORTED_NOT_CONFIRMED" | "OVERPAYMENT_RISK" | "OVER_QUOTATION_TOTAL"
  | "PAYMENT_AMOUNT_MISSING" | "PAYMENT_REFERENCE_MISSING" | "DUPLICATE_PAYMENT_REFERENCE" | "QUOTE_TOTAL_MISSING"
  | "CURRENCY_MISSING" | "CURRENCY_MISMATCH" | "SCHEDULE_TOTAL_MISMATCH";

export const RECON_FLAGS: ReconFlagCode[] = [
  "MIXED_PAYMENT_SYSTEMS", "UNALLOCATED_VERIFIED_PAYMENT", "OVERPAYMENT_RISK", "OVER_QUOTATION_TOTAL",
  "PENDING_START_INSTALLMENT_AFTER_ACTIVATION", "ACTIVATED_WITHOUT_VERIFIED_PAYMENT", "REPORTED_NOT_CONFIRMED",
  "PAYMENT_AMOUNT_MISSING", "PAYMENT_REFERENCE_MISSING", "DUPLICATE_PAYMENT_REFERENCE",
  "QUOTE_TOTAL_MISSING", "CURRENCY_MISSING", "CURRENCY_MISMATCH", "SCHEDULE_TOTAL_MISMATCH",
];

export interface ReconFlag { code: ReconFlagCode; [k: string]: unknown }
export interface ReconOrg { id: number | null; name: string | null }
/** Amounts are fixed-point strings (3 decimals); the report never carries bank references or receipt links. */
export interface ReconRow {
  jobOrderId: number; requestId: number | null; quoteId: number | null; jobStatus: string;
  stationOrganization: ReconOrg; providerOrganization: ReconOrg;
  currency: string | null; currencyAssumedForLegacyPayment: boolean; quoteTotal: string | null;
  paymentSystem: "MIXED" | "INSTALLMENTS" | "LEGACY_ONLY" | "NONE";
  legacyPayment: { id: number; status: string; amount: string | null; hasReference: boolean; hasReceipt: boolean; reportedAt: string | null; confirmedAt: string | null } | null;
  installments: { count: number; scheduleTotal: string; confirmed: string; reported: string; outstanding: string; byStatus: Record<string, number> };
  verifiedTotal: string; unpaidBalance: string | null;
  allocations: { approved: string; pending: string; unallocatedVerified: string };
  flags: ReconFlag[];
}
export interface ReconReport {
  summary: { jobs: number; withFlags: number; byFlag: Record<string, number>; byPaymentSystem: Record<string, number> };
  items: ReconRow[]; total: number; page: number; limit: number; writesEnabled: boolean; generatedAt: string;
}
export interface ReconMilestone {
  id: number; sequence: number; percent: string; trigger: string; status: string; amount: string | null; currency: string | null;
  hasReference: boolean; hasReceipt: boolean; allocatedApproved: string; allocatedPending: string; remaining: string;
}
export interface ReconLedgerEntry {
  id: number; milestoneId: number; amount: string; currency: string; state: "PENDING" | "APPROVED" | "REJECTED" | "REVERSED";
  reason: string | null; proposedByUserId: number; proposedAt: string; decidedByUserId: number | null; decidedAt: string | null;
  decisionReason: string | null; reversedByUserId: number | null; reversedAt: string | null; reversalReason: string | null;
}
export interface ReconPreview {
  executable: false; applied: false; reason: string | null; remainingSource: string;
  items: { milestoneId: number; sequence: number; amount: string; milestoneRemainingAfter: string; partial: boolean }[];
}
export interface ReconJob extends ReconRow { milestones: ReconMilestone[]; ledger: ReconLedgerEntry[]; preview: ReconPreview; writesEnabled: boolean }

export interface ReconQuery { flag?: ReconFlagCode | ""; currency?: string; page?: number; limit?: number }

export async function fetchReconciliationReport(q: ReconQuery = {}): Promise<ReconReport> {
  const params: Record<string, string> = {};
  if (q.flag) params.flag = q.flag;
  if (q.currency) params.currency = q.currency;
  params.page = String(q.page ?? 1);
  params.limit = String(q.limit ?? 50);
  const res = await axiosInstance.get<{ data: ReconReport }>("finance/reconciliation", { params });
  return res.data.data;
}

export async function fetchReconciliationJob(id: number | string): Promise<ReconJob> {
  const res = await axiosInstance.get<{ data: ReconJob }>(`finance/reconciliation/jobs/${id}`);
  return res.data.data;
}
