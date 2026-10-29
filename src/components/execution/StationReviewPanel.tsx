import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CheckCircle, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/utils";
import { submitReviewDecision, type JobReview } from "@/api/services/externalReviewService";
import OutcomeBadges from "@/components/execution/OutcomeBadges";

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
  const route = maintenance ? "maintenance" : "operations";

  const refresh = () => {
    for (const key of [["job-review", "station", String(jobOrderId)], ["station-job-order", String(jobOrderId)], ["station-job-order-reports", String(jobOrderId)], ["payment-milestones", "station", String(jobOrderId)], ["review-queue"]]) void qc.invalidateQueries({ queryKey: key });
  };
  const decide = useMutation({
    mutationFn: (body: { decision: "APPROVED" | "RETURNED"; comment?: string }) => submitReviewDecision(route, reportId as number, body),
    onSuccess: (_d, v) => { toast.success(v.decision === "APPROVED" ? t("station.approved") : t("station.returned")); setReturning(false); setComment(""); refresh(); },
    onError: (e) => {
      const code = (e as { response?: { data?: { code?: string } } })?.response?.data?.code;
      toast.error(code && (CODES as readonly string[]).includes(code) ? t(`errors.${code}`) : getApiErrorMessage(e, t("errors.generic")));
      refresh();
    },
  });

  return (
    <Card data-testid="station-review" data-stage={stage}>
      <CardHeader className="space-y-2">
        <CardTitle className="text-base">{t("station.title")}</CardTitle>
        <p className="text-sm" data-testid="review-stage">{t(`station.stage.${stage}`)}</p>
        <OutcomeBadges review={review} />
      </CardHeader>
      {(maintenance || operations) && (
        <CardContent className="space-y-3">
          {canDecide && reportId != null ? (
            <>
              <p className="text-xs text-muted-foreground">{operations ? t("station.finalNote") : t("station.maintenanceNote")}</p>
              {!returning ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="gap-1" disabled={decide.isPending} onClick={() => decide.mutate({ decision: "APPROVED" })} data-testid="approve-review">
                    <CheckCircle className="h-4 w-4" aria-hidden /> {operations ? t("station.approveFinal") : t("station.approveMaintenance")}
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
    </Card>
  );
}
