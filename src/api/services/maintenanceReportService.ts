import axiosInstance from "../config";
import type {
  MaintenanceReportCategory,
  MaintenanceReportPriority,
  CreateMaintenanceReportBody,
  MaintenanceReport,
  MaintenanceReportListPayload,
  ReportAttachment,
  ReportDecision,
} from "@/types/maintenanceReport";

interface Envelope<T> {
  success: boolean;
  data: T;
}

export interface ListReportsParams {
  status?: string;
  branchId?: number;
  page?: number;
  limit?: number;
}

/** GET /api/maintenance-issues */
export async function fetchMaintenanceReports(params?: ListReportsParams): Promise<MaintenanceReportListPayload> {
  const { data } = await axiosInstance.get<Envelope<MaintenanceReportListPayload>>("maintenance-issues", {
    params: {
      status: params?.status || undefined,
      branchId: params?.branchId,
      page: params?.page,
      limit: params?.limit,
    },
  });
  return data.data;
}

/** GET /api/maintenance-issues/:id */
export async function fetchMaintenanceReport(id: number | string): Promise<MaintenanceReport> {
  const { data } = await axiosInstance.get<Envelope<MaintenanceReport>>(`maintenance-issues/${id}`);
  return data.data;
}

/** POST /api/maintenance-issues */
export async function createMaintenanceReport(body: CreateMaintenanceReportBody): Promise<MaintenanceReport> {
  const { data } = await axiosInstance.post<Envelope<MaintenanceReport>>("maintenance-issues", body);
  return data.data;
}

/** POST /api/maintenance-issues/:id/attachments — multipart, field "file" (max 5 per report, 5MB each). */
export async function uploadMaintenanceReportAttachment(
  id: number | string,
  file: File,
  caption?: string
): Promise<ReportAttachment> {
  const form = new FormData();
  form.append("file", file);
  if (caption) form.append("caption", caption);
  const { data } = await axiosInstance.post<Envelope<ReportAttachment>>(`maintenance-issues/${id}/attachments`, form);
  return data.data;
}

/** PATCH /api/maintenance-issues/:id/supervisor-review */
export async function supervisorReviewReport(id: number | string, body: { action: "approve" | "reject"; note?: string; expectedRevision?: number }) {
  const { data } = await axiosInstance.patch<Envelope<MaintenanceReport>>(`maintenance-issues/${id}/supervisor-review`, body);
  return data.data;
}

/** PATCH /api/maintenance-issues/:id/ops-approve */
export async function opsApproveReport(id: number | string, body: { action: "approve" | "reject"; note?: string; expectedRevision?: number }) {
  const { data } = await axiosInstance.patch<Envelope<MaintenanceReport>>(`maintenance-issues/${id}/ops-approve`, body);
  return data.data;
}

/** PATCH /api/maintenance-issues/:id/decide — `branchId` is required only for EXTERNAL on a report with no branch. */
export async function decideReport(
  id: number | string,
  body: { decision: ReportDecision; note?: string; branchId?: number; expectedRevision?: number }
) {
  const { data } = await axiosInstance.patch<Envelope<MaintenanceReport>>(`maintenance-issues/${id}/decide`, body);
  return data.data;
}

export interface UpdateReportBody {
  title?: string;
  description?: string | null;
  category?: MaintenanceReportCategory | null;
  location?: string | null;
  priority?: MaintenanceReportPriority;
  assetId?: number | null;
  expectedRevision?: number;
}

/** PATCH /api/maintenance-issues/:id — descriptive fields of the caller's own, not-yet-reviewed report. */
export async function updateReport(id: number | string, body: UpdateReportBody) {
  const { data } = await axiosInstance.patch<Envelope<MaintenanceReport>>(`maintenance-issues/${id}`, body);
  return data.data;
}
