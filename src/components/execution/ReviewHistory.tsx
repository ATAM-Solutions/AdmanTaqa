import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/i18n/formatters";
import type { JobReview, ReviewDecisionInfo } from "@/api/services/externalReviewService";

function Decision({ label, d }: { label: string; d: ReviewDecisionInfo | null }) {
  const { t, i18n } = useTranslation("execution");
  if (!d) return <p className="text-xs text-muted-foreground">{label}: {t("history.pending")}</p>;
  return (
    <div className="text-xs space-y-0.5" data-testid="review-decision">
      <p>
        <span className="font-medium">{label}:</span>{" "}
        <Badge variant={d.decision === "APPROVED" ? "default" : "destructive"} className="text-[10px]">{t(`history.${d.decision}`)}</Badge>{" "}
        {d.by?.name ? <span>{t("history.by", { name: d.by.name })}</span> : null}{" "}
        {d.at ? <span className="text-muted-foreground">{formatDate(d.at, i18n.language, { dateStyle: "medium", timeStyle: "short" })}</span> : null}
      </p>
      {d.comment ? <p className="rounded bg-muted/50 px-2 py-1" data-testid="review-comment">{d.comment}</p> : null}
    </div>
  );
}

/** Every review round, oldest first: who approved or returned the work, when, and why. Rounds are never rewritten. */
export default function ReviewHistory({ review }: { review: Pick<JobReview, "rounds"> }) {
  const { t, i18n } = useTranslation("execution");
  if (review.rounds.length === 0) return null;
  return (
    <Card data-testid="review-history">
      <CardHeader><CardTitle className="text-base">{t("history.title")}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {review.rounds.map((r) => (
          <div key={r.reportId} className="rounded border p-3 space-y-1.5">
            <p className="text-sm font-medium">
              {t("history.round", { n: r.round })}
              {r.submittedAt ? <span className="ms-2 text-xs font-normal text-muted-foreground">{t("history.submitted", { date: formatDate(r.submittedAt, i18n.language, { dateStyle: "medium", timeStyle: "short" }) })}</span> : null}
            </p>
            {r.twoStep ? (
              <>
                <Decision label={t("history.maintenance")} d={r.maintenanceManager} />
                <Decision label={t("history.operations")} d={r.operationsManager} />
              </>
            ) : (
              <p className="text-xs text-muted-foreground">{t("history.legacy")}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
