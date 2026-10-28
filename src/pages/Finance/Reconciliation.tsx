import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AsyncBoundary } from "@/components/patterns/AsyncBoundary";
import { formatDate } from "@/lib/i18n/formatters";
import { RECON_FLAGS, fetchReconciliationReport, type ReconFlagCode } from "@/api/services/reconciliationService";

const SEVERE = new Set<ReconFlagCode>(["OVER_QUOTATION_TOTAL", "OVERPAYMENT_RISK", "ACTIVATED_WITHOUT_VERIFIED_PAYMENT", "SCHEDULE_TOTAL_MISMATCH", "CURRENCY_MISMATCH"]);
const num = (v: string | null | undefined) => (v == null ? "—" : v);

/** Platform-finance report. Strictly read-only: there is no action on this page that writes anything. */
export default function Reconciliation() {
  const { t, i18n } = useTranslation("finance");
  const [params, setParams] = useSearchParams();
  const flag = (RECON_FLAGS as string[]).includes(params.get("flag") ?? "") ? (params.get("flag") as ReconFlagCode) : "";
  const currency = params.get("currency") ?? "";
  const [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: ["reconciliation", flag, currency, page],
    queryFn: () => fetchReconciliationReport({ flag, currency, page, limit: 50 }),
    retry: false,
  });
  const set = (k: string, v: string) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); setParams(n, { replace: true }); setPage(1); };
  const data = q.data;
  const maxPage = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.limit ?? 50)));

  return (
    <div className="p-4 md:p-8 space-y-6" data-testid="reconciliation-page">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
        <p className="mt-2 inline-block rounded-md border bg-muted/40 px-3 py-1.5 text-sm" data-testid="read-only-note">{t("readOnly")}</p>
      </div>

      <AsyncBoundary
        isLoading={q.isLoading}
        error={q.isError ? q.error : undefined}
        loadingFallback={<div className="p-6 text-sm text-muted-foreground">{t("loading")}</div>}
      >
        {data && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card><CardContent className="py-4"><p className="text-xs text-muted-foreground">{t("summary.jobs")}</p><p className="text-2xl font-semibold" data-testid="sum-jobs">{data.summary.jobs}</p></CardContent></Card>
              <Card><CardContent className="py-4"><p className="text-xs text-muted-foreground">{t("summary.withFlags")}</p><p className="text-2xl font-semibold" data-testid="sum-flagged">{data.summary.withFlags}</p></CardContent></Card>
            </div>

            <div className="flex flex-wrap gap-2" role="group" aria-label={t("filters.flag")} data-testid="flag-filters">
              <Button size="sm" variant={flag === "" ? "default" : "outline"} onClick={() => set("flag", "")}>{t("summary.all")}</Button>
              {RECON_FLAGS.filter((f) => (data.summary.byFlag[f] ?? 0) > 0 || f === flag).map((f) => (
                <Button key={f} size="sm" variant={flag === f ? "default" : "outline"} data-flag={f} onClick={() => set("flag", f)}>
                  {t(`flag.${f}`)} <span className="ms-1 tabular-nums">({data.summary.byFlag[f] ?? 0})</span>
                </Button>
              ))}
            </div>

            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>{t("table.job")}</TableHead>
                      <TableHead>{t("table.station")}</TableHead>
                      <TableHead>{t("table.provider")}</TableHead>
                      <TableHead>{t("table.quoteTotal")}</TableHead>
                      <TableHead>{t("table.system")}</TableHead>
                      <TableHead>{t("table.standalone")}</TableHead>
                      <TableHead>{t("table.installments")}</TableHead>
                      <TableHead>{t("table.unpaid")}</TableHead>
                      <TableHead>{t("table.findings")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.length === 0 ? (
                      <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground" data-testid="recon-empty">{t("empty")}</TableCell></TableRow>
                    ) : data.items.map((r) => (
                      <TableRow key={r.jobOrderId} data-testid="recon-row" data-job={r.jobOrderId}>
                        <TableCell className="whitespace-nowrap">
                          <Link to={`/finance/reconciliation/${r.jobOrderId}`} className="font-medium text-primary hover:underline" data-testid="recon-open">#{r.jobOrderId}</Link>
                          <span className="block text-xs text-muted-foreground">{t("detail.request", { id: r.requestId ?? "—" })}</span>
                        </TableCell>
                        <TableCell>{r.stationOrganization.name ?? `#${r.stationOrganization.id ?? "—"}`}</TableCell>
                        <TableCell>{r.providerOrganization.name ?? `#${r.providerOrganization.id ?? "—"}`}</TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums" dir="ltr">{num(r.quoteTotal)} {r.currency ?? ""}</TableCell>
                        <TableCell><Badge variant={r.paymentSystem === "MIXED" ? "destructive" : "secondary"}>{t(`system.${r.paymentSystem}`)}</Badge></TableCell>
                        <TableCell className="whitespace-nowrap">
                          {r.legacyPayment && r.legacyPayment.status !== "NOT_STARTED" ? (
                            <>
                              <span dir="ltr" className="tabular-nums">{num(r.legacyPayment.amount)} {r.currency ?? ""}</span>
                              <span className="block text-xs text-muted-foreground">{t(`paymentStatus.${r.legacyPayment.status}`, { defaultValue: r.legacyPayment.status })}</span>
                            </>
                          ) : t("noStandalone")}
                        </TableCell>
                        <TableCell className="text-xs">{r.installments.count > 0 ? t("installmentSummary", { count: r.installments.count, confirmed: r.installments.confirmed, outstanding: r.installments.outstanding }) : "—"}</TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums" dir="ltr">
                          {num(r.unpaidBalance)}
                          {r.unpaidBalance != null && Number(r.unpaidBalance) < 0 ? <span className="block text-xs text-destructive">{t("overpaid", { amount: String(Math.abs(Number(r.unpaidBalance)).toFixed(3)) })}</span> : null}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {r.flags.map((f) => <Badge key={f.code} variant={SEVERE.has(f.code) ? "destructive" : "outline"} data-flag={f.code} className="text-[10px]">{t(`flag.${f.code}`)}</Badge>)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>{t("generatedAt", { date: formatDate(data.generatedAt, i18n.language, { dateStyle: "medium", timeStyle: "short" }) })}</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹</Button>
                <span>{page} / {maxPage}</span>
                <Button variant="outline" size="sm" disabled={page >= maxPage} onClick={() => setPage((p) => p + 1)}>›</Button>
              </div>
            </div>
          </>
        )}
      </AsyncBoundary>
    </div>
  );
}
