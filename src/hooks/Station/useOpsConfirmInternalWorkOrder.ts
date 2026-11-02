import { useMutation, useQueryClient } from "@tanstack/react-query";
import { opsConfirmInternalWorkOrder } from "@/api/services/internalWorkOrderService";

export default function useOpsConfirmInternalWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: number | string; comment?: string }) => opsConfirmInternalWorkOrder(id, comment),
    // On failure the view may be stale (409/403/404): reload the order so buttons reflect the truth.
    onSettled: (_d, _e, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["internal-work-order", String(id)] });
      queryClient.invalidateQueries({ queryKey: ["internal-work-order", id] });
      queryClient.invalidateQueries({ queryKey: ["internal-work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["internal-task"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}
