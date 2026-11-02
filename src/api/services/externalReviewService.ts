import axiosInstance from "@/api/config";

/** Where a job is in the technical review. Derived by the server from the report rows. */
export type ReviewStage =
  | "NOT_SUBMITTED"
  | "AWAITING_PROVIDER_MANAGER"
  | "AWAITING_MAINTENANCE_MANAGER"
  | "AWAITING_OPERATIONS_MANAGER"
  | "AWAITING_FINAL_CLOSURE"
  | "RETURNED_TO_PROVIDER"
  | "APPROVED"
  | "LEGACY_SINGLE_STEP";

export type NextActor = "PROVIDER" | "PROVIDER_MANAGER" | "MAINTENANCE_MANAGER" | "OPERATIONS_MANAGER" | "STATION" | "STATION_OWNER" | "PROVIDER_FINANCE" | "NONE";

export interface ReviewDecisionInfo {
  decision: "APPROVED" | "RETURNED";
  by: { id: number; name: string | null } | null;
  at: string | null;
  comment: string | null;
}

export interface ReviewRound {
  round: number;
  reportId: number;
  status: string;
  submittedAt: string | null;
  submittedBy: { id: number; name: string | null } | null;
  maintenanceManager: ReviewDecisionInfo | null;
  operationsManager: ReviewDecisionInfo | null;
  /** 2 = review chain (Provider Manager first, technical closure last); 1 / null = legacy two-step */
  workflowVersion?: 2 | 1 | null;
  providerManager?: ReviewDecisionInfo | null;
  technicalClosure?: { by: { id: number; name: string | null } | null; at: string | null; comment: string | null } | null;
  twoStep: boolean;
}

export interface JobReview {
  jobOrderId: number;
  status: string;
  reviewStage: ReviewStage;
  nextActor: NextActor;
  /** version of the LATEST report: 2 = review chain, 1 / null = legacy (never convert) */
  workflowVersion?: 2 | 1 | null;
  /** technical approval and financial settlement are separate facts */
  outcome: { technicalApproved: boolean; financiallySettled: boolean; installmentsSettled: number; installmentsTotal: number; awaitingPayment: boolean };
  finalInstallment: { id: number; sequence: number; status: string; stage: string | null; due: boolean; requestRequired?: boolean; requestedAt?: string | null } | null;
  rounds: ReviewRound[];
  package: {
    station: { id: number; name: string | null; nameAr?: string | null } | null;
    branch: { id: number; name: string | null; nameAr?: string | null } | null;
    provider: { id: number; name: string | null; nameAr?: string | null } | null;
    request: { id: number; title: string | null; description: string | null };
    operators: Array<{ id: number; name: string | null }>;
    visits: Array<{ id: number; type?: string; status?: string; visitDate?: string; checkedInAt?: string | null; completedAt?: string | null; notes?: string | null; completionNote?: string | null }>;
    activatedAt: string | null;
    completionDate: string | null;
    timeline: Array<{ id: number; eventType: string; message: string; at: string; actor: { id: number; name: string | null } | null; metadata?: Record<string, unknown> | null }>;
  };
}

export interface ReviewQueueItem {
  reportId: number;
  jobOrderId: number;
  externalRequestId: number;
  title: string | null;
  branch: { id: number; name: string | null; nameAr?: string | null } | null;
  provider: { id: number | null; name: string | null };
  submittedAt: string | null;
  maintenanceApprovedAt: string | null;
  stage: "MAINTENANCE_MANAGER" | "OPERATIONS_MANAGER" | "FINAL_CLOSURE" | string;
}

export interface ProviderReviewQueueItem {
  reportId: number;
  jobOrderId: number;
  externalRequestId: number;
  title: string | null;
  submittedAt: string | null;
  submittedBy: { id: number; name: string | null } | null;
  stage: "PROVIDER_MANAGER";
  /** the signed-in user wrote this report and therefore cannot approve it */
  ownReport: boolean;
}

/** true only for a NEW review-chain cycle; legacy jobs keep the old two-step UI unchanged */
export const isReviewChain = (r: { workflowVersion?: number | null } | null | undefined) => r?.workflowVersion === 2;

export type ReviewSide = "provider" | "station";

export async function fetchJobReview(side: ReviewSide, jobOrderId: number | string): Promise<JobReview> {
  const res = await axiosInstance.get<{ data: JobReview }>(`${side}/job-orders/${jobOrderId}/review`);
  return res.data.data;
}

export async function fetchReviewQueue(stage: "maintenance" | "operations" | "closure", page = 1): Promise<{ items: ReviewQueueItem[]; total: number }> {
  const res = await axiosInstance.get<{ data: { items: ReviewQueueItem[]; total: number } }>(`station/external-reviews/${stage}`, { params: { page, limit: 50 } });
  return res.data.data;
}

export async function submitReviewDecision(stage: "maintenance" | "operations", reportId: number, body: { decision: "APPROVED" | "RETURNED"; comment?: string }): Promise<unknown> {
  const res = await axiosInstance.post(`station/reports/${reportId}/${stage}-review`, body);
  return res.data;
}

/** POST /api/provider/reports/:reportId/upload-photo — evidence for a DRAFT final report (multipart, content verified by the server). */
export async function uploadReportPhoto(reportId: number, file: File, category = "general"): Promise<unknown> {
  const form = new FormData();
  form.append("file", file);
  form.append("category", category);
  const res = await axiosInstance.post(`provider/reports/${reportId}/upload-photo`, form);
  return res.data;
}

/** POST /provider/reports/:reportId/manager-review — the Provider Manager approves the technician's report or returns it (comment required). */
export async function providerManagerReview(reportId: number, decision: "APPROVED" | "RETURNED", comment?: string): Promise<unknown> {
  const res = await axiosInstance.post(`provider/reports/${reportId}/manager-review`, { decision, ...(comment?.trim() ? { comment: comment.trim() } : {}) });
  return res.data;
}

export async function fetchProviderReviewQueue(page = 1): Promise<{ items: ProviderReviewQueueItem[]; total: number }> {
  const res = await axiosInstance.get<{ data: { items: ProviderReviewQueueItem[]; total: number } }>("provider/review-queue", { params: { page, limit: 50 } });
  return res.data.data;
}

/** POST /station/reports/:reportId/technical-closure — the requesting Maintenance Manager closes the job technically. */
export async function technicalClosure(reportId: number, comment?: string): Promise<unknown> {
  const res = await axiosInstance.post(`station/reports/${reportId}/technical-closure`, comment?.trim() ? { comment: comment.trim() } : {});
  return res.data;
}

export async function fetchClosureQueue(page = 1): Promise<{ items: ReviewQueueItem[]; total: number }> {
  return fetchReviewQueue("closure", page);
}
