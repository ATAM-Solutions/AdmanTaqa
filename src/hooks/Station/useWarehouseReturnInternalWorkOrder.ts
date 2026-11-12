import { useMutation, useQueryClient } from "@tanstack/react-query";
import { warehouseReturnInternalWorkOrder } from "@/api/services/internalWorkOrderService";

/** Legacy (V1) "confirm spare-parts settlement and send to Operations" step. */
export default function useWarehouseReturnInternalWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, returnNote }: { id: number | string; returnNote?: string }) => warehouseReturnInternalWorkOrder(id, returnNote),
    // success or failure (409/403/404 mean the view is stale): reload the order, its actions, timeline, lists and the final report
    onSettled: (_d, _e, { id }) => {
      for (const key of [
        ["internal-work-order", String(id)], ["internal-work-order", id], ["internal-work-orders"], ["internal-task"],
        ["activity"], ["final-report"], ["spare-part-requests"], ["warehouse-requests"],
      ]) queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
