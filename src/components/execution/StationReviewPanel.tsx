import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CheckCircle, Lock, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { isReviewChain, submitReviewDecision, type JobReview } from "@/api/services/externalReviewService";
import OutcomeBadges from "@/components/execution/OutcomeBadges";
import { chainErrorMessage, useTechnicalClosure } from "@/hooks/Execution/useReviewChain";

const CODES = ["COMMENT_REQUIRED", "MAINTENANCE_APPROVAL_REQUIRED", "REVIEW_STAGE_CLOSED", "REPORT_NOT_AWAITING_REVIEW", "TWO_STEP_REVIEW_REQUIRED", "TWO_STEP_REVIEW_NOT_APPLICABLE"] as const;

/**
 * The station's technical review of the provider's final report. Maintenance Manager decides first, Operations Manager
 * second; each only sees the buttons for the stage that is open AND that their role may decide. The final installment
 * becomes payable only on the Operations Manager's approval (server-side).
 */
export default function StationReviewPanel({ jobOrderId, review, reportId }: { jobOrderId: number; review: JobReview; reportId: number | null }) {
  const { t } = useTranslation("execution");
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [returning, setReturning] = useState(false);
  const [comment, setComment] = useState("");
  const stage = review.reviewStage;
  const maintenance = stage === "AWAITING_MAINTENANCE_MANAGER";
  const operations = stage === "AWAITING_OPERATIONS_MANAGER";
  const canDecide = maintenance ? hasPermission("external_maintenance_v2.maintenance_review") : operations ? hasPermission("external_maintenance_v2.ops_closure") : false;
  const chain = isReviewChain(review);
  // final technical closure exists only in the review chain; Operations has a different permission and never sees it
  const closure = chain && stage === "AWAITING_FINAL_CLOSURE";
  const canClose = closure && hasPermission("external_maintenance_v2.maintenance_review");
  const [closeComment, setCloseComment] = useState("");
  const closeJob = useTechnicalClosure(jobOrderId, t, () => setCloseComment(""));
  const route = maintenance ? "maintenance" : "operations";

  const refresh = () => {
    for (const key of [["job-review", "station", String(jobOrderId)], ["station-job-order", String(jobOrderId)], ["station-job-order-reports", String(jobOrderId)], ["payment-milestones", "station", String(jobOrderId)], ["review-queue"]]) void qc.invalidateQueries({ queryKey: key });
  };
  const decide = useMutation({
    mutationFn: (body: { decision: "APPROVED" | "RETURNED"; comment?: string }) => submitReviewDecision(route, reportId as number, body),
    onSuccess: (_d, v) => { toast.success(v.decision === "APPROVED" ? t("station.approved") : t("station.returned")); setReturning(false); setComment(""); refresh(); },
    onError: (e) => {
      const code = (e as { response?: { data?: { code?: string } } })?.response?.data?.code;
      toast.error(code && (CODES as readonly string[]).includes(code) ? t(`errors.${code}`) : chainErrorMessage(e, t));
      refresh();
    },
  });

  return (
    <Card data-testid="station-review" data-stage={stage}>
      <CardHeader className="space-y-2">
        <CardTitle className="text-base">{t("station.title")}</CardTitle>
        <p className="text-sm" data-testid="review-stage">{t(`station.stage.${stage}`)}</p>
        {closure && !canClose ? <p className="text-xs text-muted-foreground" data-testid="closure-not-yours">{t("station.closureNotYours")}</p> : null}
        <OutcomeBadges review={review} />
      </CardHeader>
      {(maintenance || operations) && (
        <CardContent className="space-y-3">
          {canDecide && reportId != null ? (
            <>
              <p className="text-xs text-muted-foreground">{operations ? t(chain ? "station.finalNoteChain" : "station.finalNote") : t("station.maintenanceNote")}</p>
              {!returning ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="gap-1" disabled={decide.isPending} onClick={() => decide.mutate({ decision: "APPROVED" })} data-testid="approve-review">
                    <CheckCircle className="h-4 w-4" aria-hidden /> {operations ? t(chain ? "station.approveFinalChain" : "station.approveFinal") : t("station.approveMaintenance")}
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setReturning(true)} data-testid="return-review">
                    <Undo2 className="h-4 w-4" aria-hidden /> {t("station.returnWork")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2" data-testid="return-form">
                  <Label htmlFor="return-comment" className="text-xs">{t("station.comment")} *</Label>
                  <Textarea id="return-comment" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("station.commentRequired")} />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="destructive" disabled={decide.isPending || comment.trim().length === 0} onClick={() => decide.mutate({ decision: "RETURNED", comment: comment.trim() })} data-testid="confirm-return">{t("station.confirmReturn")}</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setReturning(false); setComment(""); }}>{t("station.cancel")}</Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground" data-testid="not-your-stage">{t("station.notYours")}</p>
          )}
        </CardContent>
      )}
      {canClose && reportId != null && (
        <CardContent className="space-y-3" data-testid="technical-closure">
          <p className="text-xs text-muted-foreground">{t("station.closureNote")}</p>
          <div className="space-y-1">
            <Label htmlFor="closure-comment" className="text-xs">{t("station.commentOptional")}</Label>
            <Textarea id="closure-comment" rows={2} value={closeComment} onChange={(e) => setCloseComment(e.target.value)} data-testid="closure-comment" />
          </div>
          <Button size="sm" className="gap-1" disabled={closeJob.isPending} onClick={() => closeJob.mutate({ reportId, comment: closeComment.trim() || undefined })} data-testid="technical-closure-button">
            <Lock className="h-4 w-4" aria-hidden /> {t("station.closeWorkOrder")}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}