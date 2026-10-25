/** `sourceReport` block returned by GET /internal/work-orders/:id and GET /station/requests/:id (read-only, report files). */
export interface SourceReportAttachment {
  id: number;
  fileType: "IMAGE" | "PDF" | "OTHER" | string;
  caption?: string | null;
  createdAt?: string;
  /** Authenticated download route (Bearer token required). Always use this, never a public URL. */
  downloadUrl: string;
}

export interface SourceReport {
  id?: number;
  attachments: SourceReportAttachment[];
}
