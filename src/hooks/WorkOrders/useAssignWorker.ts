import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignWorkerToOrder,
  fetchAssignableTechnicians,
  reassignInternalTask,
} from "@/api/services/internalTaskService";

export function useAssignableTechnicians(internalWorkOrderId: number | string, enabled: boolean) {
  return useQuery({
    queryKey: ["assignable-technicians", internalWorkOrderId],
    queryFn: () => fetchAssignableTechnicians(internalWorkOrderId),
    enabled,
    // The list depends on role/station changes made elsewhere — never serve a stale candidate list.
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}

/** Assign a worker to an order: new task, or reassignment when `taskId` is given. */
export function useAssignWorker(internalWorkOrderId: number | string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { assignedUserId: number; taskId?: number | string; notes?: string }) =>
      vars.taskId != null
        ? reassignInternalTask(vars.taskId, vars.assignedUserId)
        : assignWorkerToOrder({ internalWorkOrderId, assignedUserId: vars.assignedUserId, notes: vars.notes }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["internal-work-order", internalWorkOrderId] });
      queryClient.invalidateQueries({ queryKey: ["internal-work-order", String(internalWorkOrderId)] });
      queryClient.invalidateQueries({ queryKey: ["internal-work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["internal-tasks"] });
    },
  });
}
