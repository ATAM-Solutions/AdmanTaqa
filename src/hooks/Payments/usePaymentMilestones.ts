import { useQuery } from "@tanstack/react-query";
import { fetchMilestones } from "@/api/services/paymentMilestoneService";

/**
 * The installment schedule of a job. One query key shared with PaymentMilestonesCard, so pages can ask
 * "does this job use installments?" without a second request. Jobs with installments are paid ONLY through them:
 * the legacy single-payment form must not be shown for those.
 */
export function paymentMilestonesKey(side: "station" | "provider", jobOrderId: number | string) {
  return ["payment-milestones", side, String(jobOrderId)] as const;
}

export default function usePaymentMilestones(side: "station" | "provider", jobOrderId: number | string | null | undefined, enabled = true) {
  const q = useQuery({
    queryKey: paymentMilestonesKey(side, jobOrderId ?? ""),
    queryFn: () => fetchMilestones(side, jobOrderId!),
    enabled: enabled && jobOrderId != null && jobOrderId !== "",
    retry: false,
    refetchOnWindowFocus: false,
  });
  const count = (q.data ?? []).length;
  return { ...q, hasMilestones: count > 0, /** true only once we KNOW there is no schedule (historical job) */ isLegacyJob: q.isSuccess && count === 0 };
}
