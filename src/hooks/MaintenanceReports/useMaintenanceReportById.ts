import { useQuery } from "@tanstack/react-query";
import { fetchMaintenanceReport } from "@/api/services/maintenanceReportService";

export default function useMaintenanceReportById(id: number | string | undefined) {
  return useQuery({
    queryKey: ["maintenance-reports", "detail", id],
    queryFn: () => fetchMaintenanceReport(id!),
    enabled: id != null && id !== "",
  });
}
