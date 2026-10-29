import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { JobReview } from "@/api/services/externalReviewService";

/**
 * Technical approval and financial settlement are two separate facts: a job can be technically approved while the final
 * installment is still unpaid. "Financially settled" is shown only when EVERY installment is confirmed by the provider.
 */
export default function OutcomeBadges({ review }: { review: Pick<JobReview, "outcome" | "reviewStage"> }) {
  const { t } = useTranslation("execution");
  const { outcome } = review;
  const technical = outcome.technicalApproved ? "approved" : review.reviewStage === "NOT_SUBMITTED" ? "inProgress" : review.reviewStage === "RETURNED_TO_PROVIDER" ? "returned" : "inReview";
  const financial = outcome.installmentsTotal === 0 ? "none" : outcome.financiallySettled ? "settled" : "open";
  return (
    <div data-testid="outcome-badges" className="flex flex-wrap items-center gap-2">
      <Badge data-testid="technical-status" data-state={technical} variant={technical === "approved" ? "default" : "secondary"}>
        {t("outcome.technical")}: {t(`outcome.technicalState.${technical}`)}
      </Badge>
      <Badge data-testid="financial-status" data-state={financial} variant={financial === "settled" ? "default" : "outline"}>
        {t("outcome.financial")}: {financial === "open"
          ? t("outcome.financialState.open", { settled: outcome.installmentsSettled, total: outcome.installmentsTotal })
          : t(`outcome.financialState.${financial}`)}
      </Badge>
    </div>
  );
}
