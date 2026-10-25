import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/i18n/formatters";
import type { PaymentRecordDetails } from "@/types/station";

export type PaymentAudience = "station" | "provider";

interface Props {
  record: PaymentRecordDetails;
  audience: PaymentAudience;
  /** Provider finance users only: confirm that the money arrived, or report a problem with the transfer. */
  onConfirm?: () => void;
  onReport?: (reason: string) => void;
  busy?: boolean;
}

/**
 * The recorded transfer of a job, with its real state and who has to act next. It never says money arrived unless the
 * provider confirmed it: the station's report alone is shown as "awaiting the provider's confirmation".
 */
export default function PaymentRecordPanel({ record, audience, onConfirm, onReport, busy = false }: Props) {
  const { t, i18n } = useTranslation("paymentRecord");
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const status = record.status === "PROVIDER_CONFIRMED_RECEIVED" ? "RECEIVED" : record.status === "REJECTED" ? "REJECTED" : "SENT";
  const tone = status === "RECEIVED" ? "border-green-600/40 bg-green-50/60 dark:bg-green-950/20" : status === "REJECTED" ? "border-destructive/40 bg-destructive/5" : "border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20";
  const Icon = status === "RECEIVED" ? CheckCircle : status === "REJECTED" ? XCircle : Clock;
  const when = (v?: string | null) => (v ? formatDate(v, i18n.language, { dateStyle: "medium", timeStyle: "short" }) : null);
  const rows: [string, string | null][] = [
    [t("fields.method"), record.method ? t(`method.${record.method}`, { defaultValue: record.method }) : null],
    [t("fields.reference"), record.referenceNumber ?? null],
    [t("fields.amount"), record.amount != null && record.amount !== "" ? String(record.amount) : null],
    [t("fields.reportedAt"), when(record.stationConfirmedAt)],
    [t("fields.confirmedAt"), status === "RECEIVED" ? when(record.providerConfirmedAt) : null],
  ].filter(([, v]) => v) as [string, string | null][];

  return (
    <div className={`space-y-3 rounded-lg border p-3 ${tone}`} data-testid="payment-record" data-status={status}>
      <p className="flex items-center gap-2 text-sm font-medium"><Icon className="h-4 w-4 shrink-0" /><span data-testid="payment-record-title">{t(`${audience}.${status}.title`)}</span></p>
      <p className="text-xs text-muted-foreground" data-testid="payment-record-next">{t(`${audience}.${status}.next`)}</p>
      {status === "REJECTED" && record.rejectionReason ? <p className="text-sm" dir="auto">{t("fields.problem")}: {record.rejectionReason}</p> : null}
      {rows.length > 0 ? (
        <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[minmax(7rem,10rem)_1fr]">
          {rows.map(([k, v]) => (
            <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd dir="auto" className="break-words">{v}</dd></div>
          ))}
        </dl>
      ) : null}
      {record.receiptFileUrl ? (
        <a href={record.receiptFileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline" data-testid="payment-record-receipt">{t("openReceipt")}</a>
      ) : null}

      {audience === "provider" && status === "SENT" && (onConfirm || onReport) ? (
        <div className="space-y-2" data-testid="payment-record-actions">
          {onConfirm ? <Button size="sm" disabled={busy} onClick={onConfirm} data-testid="payment-confirm-received">{t("provider.SENT.confirm")}</Button> : null}
          {onReport && !reporting ? <Button size="sm" variant="outline" className="ms-2" disabled={busy} onClick={() => setReporting(true)} data-testid="payment-report-problem">{t("provider.SENT.reportProblem")}</Button> : null}
          {onReport && reporting ? (
            <div className="space-y-2 rounded-md border p-3" data-testid="payment-report-form">
              <Label htmlFor="payment-problem">{t("provider.SENT.problemLabel")}</Label>
              <Textarea id="payment-problem" dir="auto" value={reason} maxLength={2000} onChange={(e) => setReason(e.target.value)} />
              <p className="text-xs text-muted-foreground">{t("provider.SENT.problemHint")}</p>
              <Button size="sm" variant="destructive" disabled={busy || !reason.trim()} onClick={() => onReport(reason.trim())} data-testid="payment-report-submit">{t("provider.SENT.problemSubmit")}</Button>
              <Button size="sm" variant="ghost" className="ms-2" onClick={() => { setReporting(false); setReason(""); }}>{t("cancel")}</Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
