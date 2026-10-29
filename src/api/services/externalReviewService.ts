import axiosInstance from "@/api/config";

/** Where a job is in the technical review. Derived by the server from the report rows. */
export type ReviewStage =
  | "NOT_SUBMITTED"
  | "AWAITING_MAINTENANCE_MANAGER"
  | "AWAITING_OPERATIONS_MANAGER"
  | "RETURNED_TO_PROVIDER"
  | "APPROVED"
  | "LEGACY_SINGLE_STEP";

export type NextActor = "PROVIDER" | "MAINTENANCE_MANAGER" | "OPERATIONS_MANAGER" | "STATION" | "STATION_OWNER" | "PROVIDER_FINANCE" | "NONE";

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
  twoStep: boolean;
}

export interface JobReview {
  jobOrderId: number;
  status: string;
  reviewStage: ReviewStage;
  nextActor: NextActor;
  /** technical approval and financial settlement are separate facts */
  outcome: { technicalApproved: boolean; financiallySettled: boolean; installmentsSettled: number; installmentsTotal: number; awaitingPayment: boolean };
  finalInstallment: { id: number; sequence: number; status: string; stage: string | null; due: boolean } | null;
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
  stage: "MAINTENANCE_MANAGER" | "OPERATIONS_MANAGER";
}

export type ReviewSide = "provider" | "station";

export async function fetchJobReview(side: ReviewSide, jobOrderId: number | string): Promise<JobReview> {
  const res = await axiosInstance.get<{ data: JobReview }>(`${side}/job-orders/${jobOrderId}/review`);
  return res.data.data;
}

export async function fetchReviewQueue(stage: "maintenance" | "operations", page = 1): Promise<{ items: ReviewQueueItem[]; total: number }> {
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
