import type { StationRef } from "@/api/services/warehouseAdminService";
import { getBranchDisplayName } from "@/lib/company";

export const stationLabel = (s: StationRef, language: string) => getBranchDisplayName(s, language) || `#${s.branchId}`;

export function fmtDate(value: string | null, language: string): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString(language);
}

/**
 * System-written English text that is not a person's comment (stored defaults of automatic steps). It must never be shown
 * as a note inside an Arabic page (customer finding #2: "Auto-created on WAITING_PARTS"). Returns the text to show, a
 * translation key for a known system sentence, or null when there is nothing a person wrote.
 */
const SYSTEM_NOTE = [
  /^Auto-created on WAITING_PARTS$/,
  /^Auto-created due to InternalTask WAITING_PARTS$/,
  /^Created from the technician parts request approved by Maintenance$/,
  /^Partial return . awaiting warehouse confirmation after submit$/,
  /^Partial material return recorded \(\d+ line\(s\)\)$/,
  /^Technician submitted material return for warehouse confirmation$/,
  /^Warehouse rejected return submission$/,
];
export function personWrittenNote(message: string | null | undefined): string | null {
  const text = (message ?? "").trim();
  if (!text) return null;
  return SYSTEM_NOTE.some((re) => re.test(text)) ? null : text;
}

/** The "Approved by Maintenance on the technician's parts request for task #N (...)" history sentence -> task id, else null. */
export function maintenanceHandoffTaskId(message: string | null | undefined): number | null {
  const m = (message ?? "").match(/^Approved by Maintenance on the technician's parts request for task #(\d+)/);
  return m ? Number(m[1]) : null;
}
