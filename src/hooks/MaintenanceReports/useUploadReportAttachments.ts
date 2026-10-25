import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadMaintenanceReportAttachment } from "@/api/services/maintenanceReportService";

export interface UploadReportFilesResult {
  uploaded: number;
  failed: { name: string; message: string }[];
}

/** Adds files to an existing, not-yet-reviewed report one by one; a failed file never blocks the others. */
export default function useUploadReportAttachments(reportId: number | string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (files: File[]): Promise<UploadReportFilesResult> => {
      const result: UploadReportFilesResult = { uploaded: 0, failed: [] };
      for (const file of files) {
        try {
          await uploadMaintenanceReportAttachment(reportId, file);
          result.uploaded += 1;
        } catch (err) {
          const message =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            (err instanceof Error ? err.message : "upload failed");
          result.failed.push({ name: file.name, message });
        }
      }
      return result;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-reports"] });
    },
  });
}
