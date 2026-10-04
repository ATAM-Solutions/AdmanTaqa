import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createMaintenanceReport,
  uploadMaintenanceReportAttachment,
} from "@/api/services/maintenanceReportService";
import type { CreateMaintenanceReportBody, MaintenanceReport } from "@/types/maintenanceReport";

export interface CreateReportResult {
  report: MaintenanceReport;
  /** Files that could not be attached — the report itself WAS created. */
  failedAttachments: { name: string; message: string }[];
}

/**
 * Creates the report, then uploads each attachment one by one. An attachment failure never loses the
 * report (it already exists server-side); it is returned so the page can tell the user precisely
 * which files did not make it.
 */
export default function useCreateMaintenanceReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ body, files }: { body: CreateMaintenanceReportBody; files: File[] }): Promise<CreateReportResult> => {
      const report = await createMaintenanceReport(body);
      const failedAttachments: CreateReportResult["failedAttachments"] = [];
      for (const file of files) {
        try {
          await uploadMaintenanceReportAttachment(report.id, file);
        } catch (err) {
          const message =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            (err instanceof Error ? err.message : "upload failed");
          failedAttachments.push({ name: file.name, message });
        }
      }
      return { report, failedAttachments };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-reports"] });
    },
  });
}
