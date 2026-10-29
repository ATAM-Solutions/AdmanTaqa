import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AsyncBoundary } from "@/components/patterns/AsyncBoundary";
import { fetchReviewQueue } from "@/api/services/externalReviewService";
import { formatDate } from "@/lib/i18n/formatters";

/**
 * Review queue for ONE stage of the external-work approval. The server returns only work that has reached that stage
 * for the caller's company (and stations): the Operations queue never contains work the Maintenance Manager has not approved.
 */
export default function ExternalWorkReviewQueue({ stage }: { stage: "maintenance" | "operations" }) {
  const { t, i18n } = useTranslation("execution");
  const ar = i18n.language.startsWith("ar");
  const q = useQuery({ queryKey: ["review-queue", stage], queryFn: () => fetchReviewQueue(stage), refetchOnWindowFocus: false });
  const items = q.data?.items ?? [];
  const dt = (v: string | null) => (v ? formatDate(v, i18n.language, { dateStyle: "medium", timeStyle: "short" }) : "—");
  return (
    <div className="p-4 md:p-8 space-y-4" data-testid={`queue-${stage}`}>
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold"><ClipboardCheck className="h-5 w-5" aria-hidden />{t(`queue.${stage}.title`)}</h1>
        <p className="text-sm text-muted-foreground">{t(`queue.${stage}.subtitle`)}</p>
      </div>
      <AsyncBoundary isLoading={q.isLoading} isEmpty={!q.isError && items.length === 0} emptyFallback={<p className="text-sm text-muted-foreground" data-testid="queue-empty">{t("queue.empty")}</p>}>
        {q.isError ? <p className="text-sm text-destructive">{t("queue.loadFailed")}</p> : (
          <div className="grid gap-3">
            {items.map((i) => (
              <Card key={i.reportId} data-testid="queue-item">
                <CardHeader className="pb-2"><CardTitle className="text-base">{i.title ?? `${t("queue.request")} #${i.externalRequestId}`}</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap items-end justify-between gap-3 text-sm">
                  <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                    <div><dt className="text-xs text-muted-foreground">{t("queue.job")}</dt><dd>#{i.jobOrderId}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">{t("queue.branch")}</dt><dd>{(ar ? i.branch?.nameAr : i.branch?.name) ?? i.branch?.name ?? "—"}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">{t("queue.provider")}</dt><dd>{i.provider.name ?? "—"}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">{t("queue.submitted")}</dt><dd>{dt(i.submittedAt)}</dd></div>
                    {stage === "operations" && <div><dt className="text-xs text-muted-foreground">{t("queue.approvedOn")}</dt><dd>{dt(i.maintenanceApprovedAt)}</dd></div>}
                  </dl>
                  <Button asChild size="sm"><Link to={`/station-job-orders/${i.jobOrderId}`}>{t("queue.open")}</Link></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
