import { useMutation, useQueryClient } from "@tanstack/react-query";
import { confirmJobOrderPaymentSent } from "@/api/services/stationService";
import type { ConfirmSentBody } from "@/types/station";

export default function useConfirmPaymentSent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      jobOrderId,
      body,
    }: {
      jobOrderId: number | string;
      body?: ConfirmSentBody;
    }) => confirmJobOrderPaymentSent(jobOrderId, body),
    // also after an error: a timed-out request may have been saved by the server, so always reload the real state
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["station-requests"] });
      queryClient.invalidateQueries({ queryKey: ["station-request"] });
      queryClient.invalidateQueries({ queryKey: ["station-job-order"] });
      queryClient.invalidateQueries({ queryKey: ["station-job-orders"] });
    },
  });
}
