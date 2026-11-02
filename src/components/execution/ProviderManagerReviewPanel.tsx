import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { isReviewChain, type JobReview } from "@/api/services/externalReviewService";
import { useProviderManagerReview } from "@/hooks/Execution/useReviewChain";
import ReportPackage from "@/components/execution/ReportPackage";
import type { ProviderReportItem } from "@/types/provider";

export const PROVIDER_REVIEW_PERMISSION = "provider_job_v2.review_report";

/**
 * Step 3 of the external review chain: the Provider Manager reads the technician's report and either approves it (it
 * then goes to the requesting station) or returns it to the technician (comment required). Shown only to holders of
 * provider_job_v2.review_report, only for a new-cycle report awaiting this step. The server enforces all of it again.
 */
export default function ProviderManagerReviewPanel({ jobOrderId, review, report, ownReport }: {
  jobOrderId: number;
  review: JobReview | undefined;
  /** the submitted report, when the page has it (the package shows its text and photos) */
  report?: ProviderReportItem;
  /** override from the queue; otherwise derived from the latest round's author */
  ownReport?: boolean;
}) {
  const { t } = useTranslation("execution");
  const { hasPermission, user } = useAuth();
  const [comment, setComment] = useState("");
  const decide = useProviderManagerReview(jobOrderId, t, () => setComment(""));

  if (!review || !isReviewChain(review) || review.reviewStage !== "AWAITING_PROVIDER_MANAGER" || !hasPermission(PROVIDER_REVIEW_PERMISSION)) return null;

  const last = review.rounds[review.rounds.length - 1];
  const reportId = last?.reportId ?? report?.id ?? null;
  const own = ownReport ?? (last?.submittedBy?.id != null && user?.id != null && Number(last.submittedBy.id) === Number(user.id));
  const disabled = own || reportId == null || decide.isPending;

  return (
    <div className="space-y-4" data-testid="provider-manager-review">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">{t("manager.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("manager.intro")}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {own ? <p className="rounded border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200" data-testid="own-report-note">{t("manager.ownReport")}</p> : null}
          <div className="space-y-1">
            <Label htmlFor="manager-return-comment" className="text-xs">{t("station.comment")}</Label>
            <Textarea id="manager-return-comment" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("manager.commentRequired")} disabled={own} data-testid="manager-comment" />
            <p className="text-xs text-muted-foreground">{t("manager.commentHint")}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button size="sm" className="gap-1" disabled={disabled} onClick={() => decide.mutate({ reportId: reportId as number, decision: "APPROVED", comment: comment.trim() || undefined })} data-testid="manager-approve">
              <CheckCircle className="h-4 w-4" aria-hidden /> {t("manager.approve")}
            </Button>
            <Button size="sm" variant="outline" className="gap-1" disabled={disabled || comment.trim().length === 0} onClick={() => decide.mutate({ reportId: reportId as number, decision: "RETURNED", comment: comment.trim() })} data-testid="manager-return">
              <Undo2 className="h-4 w-4" aria-hidden /> {t("manager.return")}
            </Button>
          </div>
        </CardContent>
      </Card>
      <ReportPackage review={review} report={report} />
    </div>
  );
}
