import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { MaintenanceReportPriority, MaintenanceReportStatus } from "@/types/maintenanceReport";

const STATUS_STYLES: Record<MaintenanceReportStatus, string> = {
  SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
  SUPERVISOR_APPROVED: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-900",
  OPS_APPROVED: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
  RESOLVED_INTERNAL: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
  RESOLVED_EXTERNAL: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-900",
  REJECTED: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
};

const PRIORITY_STYLES: Record<MaintenanceReportPriority, string> = {
  LOW: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
  HIGH: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
};

export function ReportStatusBadge({ status }: { status: MaintenanceReportStatus }) {
  const { t } = useTranslation("maintenanceReports");
  return (
    <Badge variant="outline" className={`border font-semibold shadow-none ${STATUS_STYLES[status] ?? ""}`}>
      {t(`status.${status}`, { defaultValue: status })}
    </Badge>
  );
}

export function ReportPriorityBadge({ priority }: { priority: MaintenanceReportPriority }) {
  const { t } = useTranslation("maintenanceReports");
  return (
    <Badge variant="outline" className={`border font-semibold shadow-none ${PRIORITY_STYLES[priority] ?? ""}`}>
      {t(`priority.${priority}`, { defaultValue: priority })}
    </Badge>
  );
}
