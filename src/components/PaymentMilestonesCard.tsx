import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardLoadError } from "@/components/DashboardLoadError";
import { getApiErrorMessage } from "@/lib/utils";
import {
  PaymentApiError,
  confirmMilestoneReceived,
  fetchMilestones,
  reportMilestoneSent,
  uploadStationReceipt,
  type Milestone,
} from "@/api/services/paymentMilestoneService";

const CODES = [
  "PAYMENT_EVIDENCE_REQUIRED", "MILESTONE_NOT_DUE", "MILESTONE_SEQUENCE_BLOCKED", "MILESTONE_ALREADY_SENT",
  "MILESTONE_ALREADY_CONFIRMED", "MILESTONE_DISPUTED", "PAYMENT_NOT_SENT_YET", "UNSAFE_MEDIA_URL", "INSUFFICIENT_PERMISSIONS",
] as const;

/**
 * Installment schedule with the actions the CALLER may take now. Buttons come from the server's per-milestone
 * `workflow` (stage + allowed + reason), so premature / repeated / out-of-sequence actions are never offered and,
 * if attempted anyway, answer with a translated stable code and a refresh.
 */
export default function PaymentMilestonesCard({ side, jobOrderId }: { side: "station" | "provider"; jobOrderId: number | string }) {
  const { t, i18n } = useTranslation("payments");
  const qc = useQueryClient();
  const key = ["payment-milestones", side, String(jobOrderId)];
  const busy = useRef(false);
  const [ref, setRef] = useState<Record<number, string>>({});
  const [file, setFile] = useState<Record<number, File | undefined>>({});

  const q = useQuery({ queryKey: key, queryFn: () => fetchMilestones(side, jobOrderId), retry: false, refetchOnWindowFocus: false });

  const fmt = (m: Milestone) => {
    if (m.amount == null || m.amount === "") return "—";
    const n = Number(m.amount);
    const num = Number.isFinite(n) ? n.toLocaleString(i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(m.amount);
    // the currency is whatever the accepted quotation says; never assumed
    return m.currency ? `${num} ${m.currency}` : `${num} (${t("currencyUnknown")})`;
  };

  const run = useMutation({
    mutationFn: async (job: () => Promise<void>) => {
      if (busy.current) return;
      busy.current = true;
      try { await job(); } finally { busy.current = false; }
    },
    onSuccess: async () => { toast.success(t("saved")); await qc.invalidateQueries({ queryKey: key }); await qc.invalidateQueries({ queryKey: ["station-job-order"] }); },
    onError: async (e) => {
      const err = e as PaymentApiError;
      const known = CODES.find((c) => c === err.code);
      toast.error(known ? t(`errors.${known}`) : getApiErrorMessage(e, t("errors.generic")));
      if (err.status === 409 || err.status === 403 || err.status === 404) await qc.invalidateQueries({ queryKey: key });
    },
  });
  const pending = run.isPending;

  return (
    <Card data-testid="milestones-card">
      <CardHeader><CardTitle className="text-base">{t("title")}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {q.isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}</p>
        ) : q.isError && !q.data ? (
          <DashboardLoadError error={q.error} fallbackMessage={t("loadFailed")} onRetry={() => q.refetch()} />
        ) : (q.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="milestones-empty">{t("empty")}</p>
        ) : (
          <ul className="space-y-3">
            {(q.data ?? []).map((m) => {
              const w = m.workflow;
              const stage = w?.stage ?? "DUE_LATER";
              return (
                <li key={m.id} className="space-y-2 rounded-md border p-3" data-testid="milestone" data-stage={stage} data-milestone-id={m.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">#{m.sequence} · {Number(m.percent)}% · <span dir="ltr" data-testid="milestone-amount">{fmt(m)}</span></p>
                    <Badge variant={stage === "SETTLED" ? "default" : "secondary"} data-testid="milestone-stage">{t(`stage.${stage}`)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{t(`trigger.${m.trigger}`, { defaultValue: m.trigger })}</p>
                  {m.referenceNumber ? <p className="text-xs" dir="auto">{t("reference")}: <span dir="ltr">{m.referenceNumber}</span></p> : null}
                  {m.receiptUrl ? <p className="text-xs"><a className="text-primary hover:underline" href={m.receiptUrl} target="_blank" rel="noopener noreferrer" data-testid="milestone-receipt">{t("openReceipt")}</a></p> : null}

                  {side === "station" && w?.report.allowed ? (
                    <div className="grid gap-2 sm:grid-cols-2" data-testid="report-form">
                      <div className="space-y-1">
                        <Label className="text-xs">{t("referenceNumber")}</Label>
                        <Input dir="ltr" value={ref[m.id] ?? ""} onChange={(e) => setRef((p) => ({ ...p, [m.id]: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t("receipt")}</Label>
                        <input type="file" accept="image/*,application/pdf" data-testid="receipt-input" className="block w-full text-sm"
                          onChange={(e) => setFile((p) => ({ ...p, [m.id]: e.target.files?.[0] }))} />
                      </div>
                      <div className="sm:col-span-2">
                        <Button size="sm" disabled={pending || (!(ref[m.id] ?? "").trim() && !file[m.id])} data-testid="report-sent"
                          onClick={() => run.mutate(async () => {
                            const f = file[m.id];
                            const receiptUrl = f ? await uploadStationReceipt(jobOrderId, f) : undefined;
                            await reportMilestoneSent(jobOrderId, m.id, { referenceNumber: (ref[m.id] ?? "").trim() || undefined, receiptUrl });
                          })}>
                          {t("reportSent")}
                        </Button>
                        <span className="ms-2 text-xs text-muted-foreground">{t("evidenceHint")}</span>
                      </div>
                    </div>
                  ) : null}
                  {side === "provider" && w?.confirmReceipt.allowed ? (
                    <Button size="sm" disabled={pending} data-testid="confirm-received" onClick={() => run.mutate(() => confirmMilestoneReceived(jobOrderId, m.id))}>
                      {t("confirmReceived")}
                    </Button>
                  ) : null}
                  {/* why nothing can be done now */}
                  {w && !(side === "station" ? w.report.allowed : w.confirmReceipt.allowed) && stage !== "SETTLED" ? (
                    <p className="text-xs text-muted-foreground" data-testid="milestone-why">
                      {t(`why.${side === "station" ? w.report.reason : w.confirmReceipt.reason}`, { defaultValue: t(`stageHint.${stage}`) })}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
