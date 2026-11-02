import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { TFunction } from "i18next";
import { getApiErrorMessage } from "@/lib/utils";
import { fetchClosureQueue, fetchProviderReviewQueue, providerManagerReview, technicalClosure } from "@/api/services/externalReviewService";
import { requestFinalInstallment, PaymentApiError } from "@/api/services/paymentMilestoneService";

/** Stable server error codes that have a translated message in the `execution` namespace (errors.<CODE>). */
export const CHAIN_ERROR_CODES = [
  "COMMENT_REQUIRED", "SELF_REVIEW_FORBIDDEN", "REPORT_NOT_AWAITING_REVIEW", "PROVIDER_MANAGER_APPROVAL_REQUIRED", "MAINTENANCE_APPROVAL_REQUIRED",
  "REVIEW_STAGE_CLOSED", "NOT_AWAITING_TECHNICAL_CLOSURE", "MILESTONE_NOT_REQUESTED", "MILESTONE_ALREADY_REQUESTED", "REQUEST_NOT_APPLICABLE",
  "MILESTONE_NOT_DUE", "MILESTONE_SEQUENCE_BLOCKED", "MILESTONE_ALREADY_SENT", "NOT_ASSIGNED_OPERATOR", "INSUFFICIENT_PERMISSIONS",
] as const;

export const errorCodeOf = (e: unknown): string | null =>
  (e as PaymentApiError)?.code ?? (e as { response?: { data?: { code?: string } } })?.response?.data?.code ?? null;

/** Translated message for a chain action error; falls back to the server message, then a generic one. */
export function chainErrorMessage(e: unknown, t: TFunction): string {
  const code = errorCodeOf(e);
  return code && (CHAIN_ERROR_CODES as readonly string[]).includes(code) ? t(`errors.${code}`) : getApiErrorMessage(e, t("errors.generic"));
}

/** Everything that can change after a chain action: review, job order, reports, installments and every queue. */
export function useInvalidateChain(jobOrderId: number | string) {
  const qc = useQueryClient();
  return () => {
    const id = String(jobOrderId);
    for (const key of [
      ["job-review", "provider", id], ["job-review", "station", id],
      ["provider-job-order", id], ["provider-job-order", jobOrderId], ["provider-job-order-reports", id], ["provider-job-orders"],
      ["station-job-order", id], ["station-job-order-reports", id], ["station-job-orders"],
      ["payment-milestones", "provider", id], ["payment-milestones", "station", id],
      ["review-queue"], ["provider-review-queue"],
    ]) void qc.invalidateQueries({ queryKey: key });
  };
}

export function useProviderManagerReview(jobOrderId: number, t: TFunction, onDone?: (decision: "APPROVED" | "RETURNED") => void) {
  const refresh = useInvalidateChain(jobOrderId);
  return useMutation({
    mutationFn: (v: { reportId: number; decision: "APPROVED" | "RETURNED"; comment?: string }) => providerManagerReview(v.reportId, v.decision, v.comment),
    onSuccess: (_d, v) => { toast.success(v.decision === "APPROVED" ? t("manager.approved") : t("manager.returned")); onDone?.(v.decision); refresh(); },
    onError: (e) => { toast.error(chainErrorMessage(e, t)); refresh(); },
  });
}

export function useTechnicalClosure(jobOrderId: number, t: TFunction, onDone?: () => void) {
  const refresh = useInvalidateChain(jobOrderId);
  return useMutation({
    mutationFn: (v: { reportId: number; comment?: string }) => technicalClosure(v.reportId, v.comment),
    onSuccess: () => { toast.success(t("station.closed")); onDone?.(); refresh(); },
    onError: (e) => { toast.error(chainErrorMessage(e, t)); refresh(); },
  });
}

export function useRequestFinalInstallment(jobOrderId: number | string) {
  const refresh = useInvalidateChain(jobOrderId);
  return useMutation({
    mutationFn: (milestoneId: number) => requestFinalInstallment(jobOrderId, milestoneId),
    onSettled: refresh,
  });
}

export const useProviderReviewQueue = (enabled = true) =>
  useQuery({ queryKey: ["provider-review-queue"], queryFn: () => fetchProviderReviewQueue(), enabled, refetchOnWindowFocus: false });

export const useClosureQueue = (enabled = true) =>
  useQuery({ queryKey: ["review-queue", "closure"], queryFn: () => fetchClosureQueue(), enabled, refetchOnWindowFocus: false });
