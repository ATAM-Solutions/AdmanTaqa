/** Client-side checks that mirror POST /maintenance-issues/:id/attachments (the server stays authoritative). */
export const REPORT_MAX_FILES = 5;
export const REPORT_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const REPORT_ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];

export type ReportFileProblem = "type" | "size" | "limit";

/** Returns why `file` cannot be added, or null. `currentCount` is how many files the report would already hold. */
export function checkReportFile(file: { type: string; size: number }, currentCount: number): ReportFileProblem | null {
  if (!REPORT_ACCEPTED_TYPES.includes(file.type)) return "type";
  if (file.size > REPORT_MAX_FILE_BYTES) return "size";
  if (currentCount >= REPORT_MAX_FILES) return "limit";
  return null;
}
