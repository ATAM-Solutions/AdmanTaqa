import { useMutation, useQueryClient } from "@tanstack/react-query";
import { decideReport, opsApproveReport, supervisorReviewReport, updateReport, type UpdateReportBody } from "@/api/services/maintenanceReportService";
import type { ReportDecision } from "@/types/maintenanceReport";

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["maintenance-reports"] });
    // a decision can create an internal work order / external request
    queryClient.invalidateQueries({ queryKey: ["internal-work-orders"] });
    queryClient.invalidateQueries({ queryKey: ["station-requests"] });
  };
}

export function useSupervisorReview(id: number | string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: { action: "approve" | "reject"; note?: string; expectedRevision?: number }) => supervisorReviewReport(id, body),
    onSuccess: invalidate,
  });
}

export function useOpsApprove(id: number | string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: { action: "approve" | "reject"; note?: string; expectedRevision?: number }) => opsApproveReport(id, body),
    onSuccess: invalidate,
  });
}

export function useDecideReport(id: number | string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: { decision: ReportDecision; note?: string; branchId?: number; expectedRevision?: number }) => decideReport(id, body),
    onSuccess: invalidate,
  });
}

export function useUpdateReport(id: number | string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: UpdateReportBody) => updateReport(id, body),
    onSuccess: invalidate,
  });
}
