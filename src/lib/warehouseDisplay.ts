import type { StationRef } from "@/api/services/warehouseAdminService";
import { getBranchDisplayName } from "@/lib/company";

export const stationLabel = (s: StationRef, language: string) => getBranchDisplayName(s, language) || `#${s.branchId}`;

export function fmtDate(value: string | null, language: string): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString(language);
}
