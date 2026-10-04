import { useQuery } from "@tanstack/react-query";
import { fetchMaintenanceReports, type ListReportsParams } from "@/api/services/maintenanceReportService";

export default function useMaintenanceReports(params?: ListReportsParams) {
  return useQuery({
    queryKey: ["maintenance-reports", params?.status, params?.branchId, params?.page, params?.limit],
    queryFn: () => fetchMaintenanceReports(params),
  });
}
