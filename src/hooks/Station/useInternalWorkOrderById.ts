import { useQuery } from "@tanstack/react-query";
import { fetchInternalWorkOrderById } from "@/api/services/internalWorkOrderService";

export default function useInternalWorkOrderById(id: number | string | null | undefined) {
  return useQuery({
    queryKey: ["internal-work-order", id],
    queryFn: () => fetchInternalWorkOrderById(id!),
    enabled: id != null && id !== "",
    // 403/404 are answers, not transient failures — show them immediately.
    retry: (count, err) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      return (status == null || status >= 500) && count < 2;
    },
  });
}
