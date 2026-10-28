import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import usePaymentMilestones from "@/hooks/Payments/usePaymentMilestones";
import { summarizePayments } from "@/lib/externalFlow";

interface Props {
  side: "provider" | "station";
  jobOrderId: number | string;
  /** where "manage payments" leads; the job order page is the only place with payment buttons */
  jobOrderHref: string;
  /** status of the historical single-payment record, shown read-only when the job has no schedule */
  legacyStatus?: string | null;
  /** payment amounts are commercial data; pass false when the viewer may not read them */
  enabled?: boolean;
}

/**
 * READ-ONLY payment progress for the RFQ / Quotation / Request pages. It reads the same milestone query as the job
 * order page but renders no inputs and no buttons, so a payment action exists on exactly one page.
 */
export default function PaymentProgressSummary({ side, jobOrderId, jobOrderHref, legacyStatus, enabled = true }: Props) {
  const { t } = useTranslation("flow");
  const q = usePaymentMilestones(side, jobOrderId, enabled);
  if (!enabled) return null;

  const progress = summarizePayments(q.data ?? []);
  const pct = Math.min(100, Math.max(0, progress.settledPercent));

  return (
    <Card data-testid="payment-summary">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("paymentSummary.title")}</CardTitle>
        <p className="text-xs text-muted-foreground">{t("paymentSummary.readOnly")}</p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {q.isLoading ? (
          <p className="flex items-center gap-2 text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" /> {t("paymentSummary.loading")}</p>
        ) : q.isError ? (
          <p className="text-muted-foreground" data-testid="payment-summary-error">{t("paymentSummary.loadFailed")}</p>
        ) : progress.total === 0 ? (
          <p className="text-muted-foreground" data-testid="payment-summary-legacy">
            {legacyStatus ? `${t("paymentSummary.legacy")} ${t("paymentSummary.legacyStatus", { status: legacyStatus })}` : t("paymentSummary.none")}
          </p>
        ) : (
          <>
            <p className="font-medium" data-testid="payment-summary-count">{t("paymentSummary.settled", { settled: progress.settled, total: progress.total })}</p>
            <div className="h-2 w-full overflow-hidden rounded bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">{t("paymentSummary.percent", { percent: pct })}</p>
            <div className="flex flex-wrap gap-2">
              {progress.awaitingReport > 0 ? <Badge variant="secondary">{t("paymentSummary.awaitingReport", { count: progress.awaitingReport })}</Badge> : null}
              {progress.awaitingConfirmation > 0 ? <Badge variant="secondary">{t("paymentSummary.awaitingConfirmation", { count: progress.awaitingConfirmation })}</Badge> : null}
              {progress.dueLater > 0 ? <Badge variant="outline">{t("paymentSummary.dueLater", { count: progress.dueLater })}</Badge> : null}
              {progress.disputed > 0 ? <Badge variant="destructive">{t("paymentSummary.disputed", { count: progress.disputed })}</Badge> : null}
            </div>
            <p className="text-xs" data-testid="payment-summary-next">
              {progress.waitingOn ? t(`paymentSummary.waitingOn.${progress.waitingOn}`) : progress.settled === progress.total ? t("paymentSummary.allSettled") : null}
            </p>
          </>
        )}
        <Link to={jobOrderHref} className="inline-block text-xs text-primary hover:underline" data-testid="payment-summary-manage" data-side={side}>
          {t("paymentSummary.manage")}
        </Link>
      </CardContent>
    </Card>
  );
}
