import axiosInstance from "@/api/config";

export type ReportStage = "PROGRESS" | "COMPLETED" | "FINAL" | "CANCELLED";
export type ReportRoot = "workOrder" | "stationRequest";
export type UsedBasis = "RECORDED" | "DEFAULT_OR_UNCONFIRMED" | "NOT_YET_RECORDED" | "NONE_ISSUED";

export interface ReportEvent {
  id: string;
  kind: string;
  category: string;
  at: string;
  actor: string | null;
  actorLabel: string | null;
  from: string | null;
  to: string | null;
  message: string | null;
  decision?: "APPROVED" | "REJECTED";
  meta: { stage?: string; eventType?: string; provider?: { name: string }; assignee?: string; fromPerson?: string; toPerson?: string; [k: string]: unknown };
}
export interface ReportPhoto {
  id: string;
  source: "TASK" | "REPORT" | "PROVIDER";
  phase: string;
  caption: string | null;
  at: string | null;
  by: string | null;
  fileType: string | null;
  url: string | null;
  embeddable: boolean;
}
export interface ReportPartLine {
  id: number;
  partName: string;
  partCode: string | null;
  status: string;
  requested: number;
  approved: number | null;
  issued: number | null;
  used: number | null;
  returned: number | null;
  usedBasis: UsedBasis;
}
export interface FinalReport {
  reference: string;
  kind: "INTERNAL" | "EXTERNAL";
  stage: ReportStage;
  status: string;
  generatedAt: string;
  generatedBy: string | null;
  company: { name: string | null; nameAr: string | null; logoUrl: string | null };
  request: { id: number; number: string; title: string | null; description: string | null; priority: string | null; createdAt: string | null; createdBy: string | null };
  source: { title: string | null; description: string | null; reportedAt: string | null; reportedBy: string | null } | null;
  station: { nameEn: string | null; nameAr: string | null; address: string | null } | null;
  asset: { name: string; type: string | null; model: string | null; serialNumber: string | null; location: string | null } | null;
  team: { taskId: number; assignee: string | null; status: string; acceptedAt: string | null; startedAt: string | null; completedAt: string | null; closedAt: string | null }[];
  provider: { name: string; nameAr: string | null } | null;
  work: {
    entries: { taskId?: number; assignee?: string | null; inspection?: string | null; completionReport?: string | null; workPerformed?: string | null; problemFound?: string | null; notes?: string | null; reportId?: number; status?: string; findings?: string | null; actionsTaken?: string | null; recommendations?: string | null; submittedAt?: string | null }[];
    materialsSummaries: { taskId: number; used: string | null; returned: string | null }[];
  };
  execution: {
    jobs: { id: number; status: string; activatedAt: string | null; expectedStartDate: string | null; expectedEndDate: string | null }[];
    visits: { id: number; type: string; date: string | null; status: string; checkedInAt: string | null; completedAt: string | null; completionNote: string | null }[];
    reports: { id: number; status: string; submittedAt: string | null; reviewedAt: string | null }[];
  } | null;
  progress: ReportEvent[];
  approvals: ReportEvent[];
  comments: ReportEvent[];
  photos: ReportPhoto[];
  parts: { restricted: boolean; orders: { id: number; status: string; createdAt: string | null; requestedBy: string | null; rejectionReason: string | null; lines: ReportPartLine[] }[] } | null;
  completion: { completedAt: string | null; closedAt: string | null; closedBy: string | null; reviewedAt: string | null; reviewedBy: string | null; basis: string | null };
  outcome: { code: string; closedAt: string | null };
  missing: string[];
}

const base = (root: ReportRoot, id: number | string) => (root === "workOrder" ? `internal/work-orders/${id}/final-report` : `station/requests/${id}/final-report`);

export async function fetchFinalReport(root: ReportRoot, id: number | string): Promise<FinalReport> {
  const res = await axiosInstance.get(base(root, id));
  return res.data.data as FinalReport;
}

/** The PDF is generated on the server for the signed-in user; it is saved from an authenticated request, never a public link. */
export async function downloadFinalReportPdf(root: ReportRoot, id: number | string, lang: "en" | "ar", reference: string): Promise<void> {
  const res = await axiosInstance.get(`${base(root, id)}/pdf`, { params: { lang }, responseType: "blob" });
  const href = URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = `maintenance-report-${reference}-${lang}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(href);
}
