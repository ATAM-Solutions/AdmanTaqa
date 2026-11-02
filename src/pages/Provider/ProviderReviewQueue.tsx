import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ClipboardCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AsyncBoundary } from "@/components/patterns/AsyncBoundary";
import { useProviderReviewQueue } from "@/hooks/Execution/useReviewChain";
import { formatDate } from "@/lib/i18n/formatters";

/**
 * The Provider Manager's queue: technician reports waiting for approval before they reach the requesting station.
 * The server returns only this company's reports; the manager's own reports are listed but cannot be approved by them.
 */
export default function ProviderReviewQueue() {
  const { t, i18n } = useTranslation("execution");
  const q = useProviderReviewQueue();
  const items = q.data?.items ?? [];
  const dt = (v: string | null) => (v ? formatDate(v, i18n.language, { dateStyle: "medium", timeStyle: "short" }) : "—");
  return (
    <div className="p-4 md:p-8 space-y-4" data-testid="queue-provider">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold"><ClipboardCheck className="h-5 w-5" aria-hidden />{t("queue.provider_manager.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("queue.provider_manager.subtitle")}</p>
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
                    <div><dt className="text-xs text-muted-foreground">{t("queue.submitted")}</dt><dd>{dt(i.submittedAt)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">{t("queue.submittedBy")}</dt><dd>{i.submittedBy?.name ?? "—"}</dd></div>
                  </dl>
                  <div className="flex flex-wrap items-center gap-2">
                    {i.ownReport ? <Badge variant="secondary" data-testid="queue-own-report">{t("queue.ownReport")}</Badge> : null}
                    <Button asChild size="sm"><Link to={`/provider-job-orders/${i.jobOrderId}`}>{t("queue.open")}</Link></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
