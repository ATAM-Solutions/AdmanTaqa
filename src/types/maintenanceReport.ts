/**
 * Maintenance reports (بلاغات) — the backend's "maintenance issues" (/api/maintenance-issues).
 * NOT the external-job execution reports and NOT external requests / work orders.
 */
export type MaintenanceReportStatus =
  | "SUBMITTED"
  | "SUPERVISOR_APPROVED"
  | "OPS_APPROVED"
  | "RESOLVED_INTERNAL"
  | "RESOLVED_EXTERNAL"
  | "REJECTED";

export const MAINTENANCE_REPORT_STATUSES: MaintenanceReportStatus[] = [
  "SUBMITTED",
  "SUPERVISOR_APPROVED",
  "OPS_APPROVED",
  "RESOLVED_INTERNAL",
  "RESOLVED_EXTERNAL",
  "REJECTED",
];

export type MaintenanceReportPriority = "LOW" | "MEDIUM" | "HIGH";
export const MAINTENANCE_REPORT_PRIORITIES: MaintenanceReportPriority[] = ["LOW", "MEDIUM", "HIGH"];

export const MAINTENANCE_REPORT_CATEGORIES = [
  "ELECTRICAL",
  "MECHANICAL",
  "PLUMBING",
  "HVAC",
  "STRUCTURAL",
  "SAFETY",
  "IT_NETWORK",
  "OTHER",
] as const;
export type MaintenanceReportCategory = (typeof MAINTENANCE_REPORT_CATEGORIES)[number];

export interface ReportUserRef {
  id: number;
  fullName: string;
  email?: string;
}

export interface ReportAttachment {
  id: number;
  /** Absolute, fetchable URL (resolved by the server). */
  fileUrl: string;
  fileType: "IMAGE" | "PDF" | "OTHER" | string;
  caption?: string | null;
  createdAt?: string;
  UploadedByUser?: ReportUserRef | null;
}

export interface MaintenanceReport {
  id: number;
  organizationId: number;
  branchId: number | null;
  assetId: number | null;
  title: string;
  description?: string | null;
  category?: MaintenanceReportCategory | null;
  location?: string | null;
  priority: MaintenanceReportPriority;
  status: MaintenanceReportStatus;
  createdAt: string;
  updatedAt?: string;
  supervisorNote?: string | null;
  opsNote?: string | null;
  decisionNote?: string | null;
  rejectionNote?: string | null;
  decisionType?: "INTERNAL" | "EXTERNAL" | null;
  supervisorReviewedAt?: string | null;
  opsApprovedAt?: string | null;
  decidedAt?: string | null;
  rejectedAt?: string | null;
  SubmittedByUser?: ReportUserRef | null;
  SupervisorReviewedByUser?: ReportUserRef | null;
  OpsApprovedByUser?: ReportUserRef | null;
  DecidedByUser?: ReportUserRef | null;
  RejectedByUser?: ReportUserRef | null;
  Asset?: { id: number; name: string } | null;
  Branch?: { id: number; nameEn: string; nameAr: string } | null;
  InternalWorkOrder?: { id: number; title: string; status: string } | null;
  ExternalRequest?: { id: number; status: string } | null;
  MaintenanceIssueAttachments?: ReportAttachment[];
}

export interface MaintenanceReportListPayload {
  items: MaintenanceReport[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  counters: Partial<Record<MaintenanceReportStatus, number>>;
}

export interface CreateMaintenanceReportBody {
  title: string;
  description?: string | null;
  branchId?: number | null;
  assetId?: number | null;
  category?: MaintenanceReportCategory | null;
  location?: string | null;
  priority?: MaintenanceReportPriority;
}

export type ReportDecision = "INTERNAL" | "EXTERNAL" | "reject";
