import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AsyncBoundary } from "@/components/patterns/AsyncBoundary";
import { formatDate } from "@/lib/i18n/formatters";
import { fetchReconciliationJob } from "@/api/services/reconciliationService";

/** One job: findings, installments with remaining balance, allocation history and a PREVIEW of a proposed allocation. No write action exists here. */
export default function ReconciliationJob() {
  const { t, i18n } = useTranslation("finance");
  const { t: tPay } = useTranslation("payments");
  const { id } = useParams<{ id: string }>();
  const q = useQuery({ queryKey: ["reconciliation-job", id], queryFn: () => fetchReconciliationJob(id!), enabled: !!id, retry: false });
  const job = q.data;
  const cur = job?.currency ?? "";
  const when = (s: string | null) => (s ? formatDate(s, i18n.language, { dateStyle: "medium", timeStyle: "short" }) : "—");

  return (
    <div className="p-4 md:p-8 space-y-6" data-testid="reconciliation-job">
      <Button variant="ghost" asChild>
        <Link to="/finance/reconciliation" className="gap-2"><ChevronLeft className="h-4 w-4 rtl:rotate-180" />{t("detail.back")}</Link>
      </Button>
      <AsyncBoundary
        isLoading={q.isLoading}
        error={q.isError ? q.error : undefined}
        loadingFallback={<div className="p-6 text-sm text-muted-foreground">{t("loading")}</div>}
      >
        {job && (
          <>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t("detail.heading", { id: job.jobOrderId })}</h1>
              <p className="text-sm text-muted-foreground">
                {t("detail.request", { id: job.requestId ?? "—" })} · {job.stationOrganization.name ?? "—"} ↔ {job.providerOrganization.name ?? "—"} · {job.jobStatus}
              </p>
              <p className="mt-2 inline-block rounded-md border bg-muted/40 px-3 py-1.5 text-sm">{t("readOnly")}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [t("table.quoteTotal"), job.quoteTotal],
                [t("table.verified"), job.verifiedTotal],
                [t("table.unpaid"), job.unpaidBalance],
                [t("table.currency"), job.currency],
              ].map(([label, value]) => (
                <Card key={label as string}><CardContent className="py-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-semibold tabular-nums" dir="ltr">{value ?? "—"}</p></CardContent></Card>
              ))}
            </div>

            <Card data-testid="findings">
              <CardHeader><CardTitle className="text-base">{t("detail.findings")}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {job.flags.length === 0 ? <p className="text-muted-foreground">{t("detail.noFindings")}</p> : job.flags.map((f) => (
                  <div key={f.code} data-flag={f.code}>
                    <p className="font-medium">{t(`flag.${f.code}`)}</p>
                    <p className="text-muted-foreground">{t(`flagHelp.${f.code}`, { amount: String(f.amount ?? ""), excess: String(f.excess ?? f.excessIfScheduleFullyPaid ?? ""), scheduleTotal: String(f.scheduleTotal ?? ""), quoteTotal: String(f.quoteTotal ?? "") })}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {job.legacyPayment && (
              <Card data-testid="standalone">
                <CardHeader><CardTitle className="text-base">{t("detail.standalone")}</CardTitle></CardHeader>
                <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
                  <p><span className="text-muted-foreground">{t("detail.standaloneFields.status")}: </span>{t(`paymentStatus.${job.legacyPayment.status}`, { defaultValue: job.legacyPayment.status })}</p>
                  <p><span className="text-muted-foreground">{t("detail.standaloneFields.amount")}: </span><span dir="ltr" className="tabular-nums">{job.legacyPayment.amount ?? "—"} {cur}</span></p>
                  <p><span className="text-muted-foreground">{t("detail.standaloneFields.reference")}: </span>{job.legacyPayment.hasReference ? t("detail.recorded") : t("detail.notRecorded")}</p>
                  <p><span className="text-muted-foreground">{t("detail.standaloneFields.receipt")}: </span>{job.legacyPayment.hasReceipt ? t("detail.recorded") : t("detail.notRecorded")}</p>
                  <p><span className="text-muted-foreground">{t("detail.standaloneFields.reported")}: </span>{when(job.legacyPayment.reportedAt)}</p>
                  <p><span className="text-muted-foreground">{t("detail.standaloneFields.confirmed")}: </span>{when(job.legacyPayment.confirmedAt)}</p>
                  {job.currencyAssumedForLegacyPayment && <p className="sm:col-span-2 text-xs text-muted-foreground">{t("assumedCurrency")}</p>}
                </CardContent>
              </Card>
            )}

            <Card data-testid="installments">
              <CardHeader><CardTitle className="text-base">{t("detail.installments")}</CardTitle></CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    {(["seq", "percent", "trigger", "status", "amount", "allocated", "pending", "remaining"] as const).map((c) => <TableHead key={c}>{t(`detail.installmentCols.${c}`)}</TableHead>)}
                  </TableRow></TableHeader>
                  <TableBody>
                    {job.milestones.map((m) => (
                      <TableRow key={m.id} data-testid="recon-milestone">
                        <TableCell>{m.sequence}</TableCell>
                        <TableCell className="tabular-nums">{Number(m.percent)}%</TableCell>
                        <TableCell>{tPay(`trigger.${m.trigger}`, { defaultValue: m.trigger })}</TableCell>
                        <TableCell>{m.status}</TableCell>
                        <TableCell className="tabular-nums" dir="ltr">{m.amount ?? "—"} {m.currency ?? ""}</TableCell>
                        <TableCell className="tabular-nums" dir="ltr">{m.allocatedApproved}</TableCell>
                        <TableCell className="tabular-nums" dir="ltr">{m.allocatedPending}</TableCell>
                        <TableCell className="tabular-nums font-medium" dir="ltr">{m.remaining}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card data-testid="ledger">
              <CardHeader><CardTitle className="text-base">{t("detail.ledger")}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {job.ledger.length === 0 ? <p className="text-muted-foreground">{t("detail.ledgerEmpty")}</p> : job.ledger.map((e) => (
                  <div key={e.id} className="rounded border p-2" data-state={e.state}>
                    <p className="font-medium"><span dir="ltr">{t("detail.ledgerRow", { amount: e.amount, currency: e.currency, milestone: job.milestones.find((m) => m.id === e.milestoneId)?.sequence ?? e.milestoneId })}</span> · <Badge variant="outline">{t(`detail.ledgerState.${e.state}`)}</Badge></p>
                    <p className="text-xs text-muted-foreground">{when(e.proposedAt)}{e.reason ? ` · ${e.reason}` : ""}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card data-testid="preview" className="border-dashed">
              <CardHeader><CardTitle className="text-base">{t("detail.preview")}</CardTitle><p className="text-xs text-muted-foreground" data-testid="preview-note">{t("detail.previewNote")}</p></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {job.preview.items.length === 0 ? (
                  <p className="text-muted-foreground">{job.preview.reason ? t(`detail.previewReason.${job.preview.reason}`, { defaultValue: job.preview.reason }) : "—"}</p>
                ) : (
                  <>
                    {job.preview.items.map((i) => (
                      <p key={i.milestoneId} data-testid="preview-item">{t("detail.previewItem", { amount: `${i.amount} ${cur}`, sequence: i.sequence, partial: i.partial ? t("detail.partial") : t("detail.full"), left: `${i.milestoneRemainingAfter} ${cur}` })}</p>
                    ))}
                    <p className="text-xs text-muted-foreground">{t("detail.previewRemaining", { amount: `${job.preview.remainingSource} ${cur}` })}</p>
                  </>
                )}
                {!job.writesEnabled && <p className="text-xs text-muted-foreground" data-testid="writes-disabled">{t("detail.writesDisabled")}</p>}
              </CardContent>
            </Card>
          </>
        )}
      </AsyncBoundary>
    </div>
  );
}
