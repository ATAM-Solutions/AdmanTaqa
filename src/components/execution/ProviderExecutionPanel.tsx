import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CheckCircle2, Circle, Loader2, MapPin, Upload, Send, UserPlus, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/utils";
import {
  assignProviderJobOrderOperator,
  checkinProviderVisit,
  completeProviderVisit,
  createProviderJobOrderReport,
  createProviderVisit,
  addProviderVisitNote,
  fetchOperators,
  fetchProviderJobOrderReports,
  fetchProviderJobOrderVisits,
  submitProviderReport,
  updateProviderJobOrderStatus,
  updateProviderReport,
  uploadProviderJobOrderAttachment,
  uploadProviderVisitPhoto,
} from "@/api/services/providerService";
import { uploadReportPhoto, type JobReview } from "@/api/services/externalReviewService";
import type { ProviderReportItem } from "@/types/provider";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ERROR_CODES = ["TWO_STEP_REVIEW_REQUIRED", "STATUS_SET_BY_REVIEW_WORKFLOW", "FINAL_REPORT_REQUIRED"] as const;

interface Props {
  jobOrderId: number;
  status: string;
  review: JobReview | undefined;
  assignedOperators: Array<{ id: number; name: string }>;
}

type Visit = { id: number; status?: string; type?: string; visitDate?: string; notes?: string | null };

/**
 * The provider's execution workspace on the job order: operator → start work → evidence → final report → submit.
 * It only offers the step that is open for the current state; the server enforces every transition and permission.
 */
export default function ProviderExecutionPanel({ jobOrderId, status, review, assignedOperators }: Props) {
  const { t } = useTranslation("execution");
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const canExecute = hasPermission("provider.jobs.execute") || hasPermission("provider.job_orders.update_status");
  const canAssign = hasPermission("provider.job_orders.assign_operator") || hasPermission("provider.jobs.execute");
  const canManualCheckin = hasPermission("provider.jobs.manual_checkin");
  const canUpload = hasPermission("provider.job_orders.upload") || hasPermission("provider.visits.upload") || canExecute;
  const canReport = hasPermission("provider.reports.create") || canExecute;
  const canSubmit = hasPermission("provider.reports.submit") || hasPermission("provider.jobs.submit_review");

  const visitsQ = useQuery({ queryKey: ["provider-job-order-visits", String(jobOrderId)], queryFn: () => fetchProviderJobOrderVisits(jobOrderId) });
  const reportsQ = useQuery({ queryKey: ["provider-job-order-reports", String(jobOrderId)], queryFn: () => fetchProviderJobOrderReports(jobOrderId) });
  const operatorsQ = useQuery({ queryKey: ["operators"], queryFn: fetchOperators, enabled: canAssign && assignedOperators.length === 0 });

  const visits = (visitsQ.data ?? []) as Visit[];
  const reports = (reportsQ.data ?? []) as ProviderReportItem[];
  const checkedIn = visits.find((v) => v.status === "CHECKED_IN");
  const openVisit = checkedIn ?? visits.find((v) => v.status === "DRAFT" || v.status === "SCHEDULED");
  const hasCompletedVisit = visits.some((v) => v.status === "COMPLETED");
  const draft = reports.find((r) => r.status === "DRAFT");
  const lastReturned = [...reports].filter((r) => r.status === "REJECTED").sort((a, b) => b.id - a.id)[0];

  const refresh = () => {
    for (const key of [["provider-job-order", String(jobOrderId)], ["provider-job-order", jobOrderId], ["provider-job-order-visits", String(jobOrderId)], ["provider-job-order-reports", String(jobOrderId)], ["job-review", "provider", String(jobOrderId)], ["provider-job-orders"]]) {
      void qc.invalidateQueries({ queryKey: key });
    }
  };
  const fail = (e: unknown) => {
    const code = (e as { response?: { data?: { code?: string } } })?.response?.data?.code;
    toast.error(code && (ERROR_CODES as readonly string[]).includes(code) ? t(`errors.${code}`) : getApiErrorMessage(e, t("errors.generic")));
    refresh();
  };
  const run = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: refresh,
    onError: fail,
  });
  const busy = run.isPending;

  // ── step state ──
  const executing = ["ACTIVE", "IN_PROGRESS", "WAITING_PARTS", "REWORK_REQUIRED"].includes(status);
  const underReview = status === "UNDER_REVIEW";
  const hasOperator = assignedOperators.length > 0;
  const started = status === "IN_PROGRESS" || Boolean(checkedIn) || hasCompletedVisit;
  const steps = [
    { key: "operator", done: hasOperator },
    { key: "start", done: started },
    { key: "evidence", done: hasCompletedVisit },
    { key: "report", done: underReview || status === "CLOSED" || status === "COMPLETED" },
  ];

  // ── operator ──
  const [operatorId, setOperatorId] = useState("");
  // ── visit ──
  const [note, setNote] = useState("");
  const [completion, setCompletion] = useState("");
  const [reason, setReason] = useState("");
  const [photoKind, setPhotoKind] = useState<"before" | "after" | "other">("before");
  const photoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // ── report ──
  const base = draft ?? lastReturned;
  const [form, setForm] = useState<{ findings: string; actionsTaken: string; recommendations: string } | null>(null);
  const values = form ?? { findings: base?.findings ?? "", actionsTaken: base?.actionsTaken ?? "", recommendations: base?.recommendations ?? "" };
  const reportPhotoRef = useRef<HTMLInputElement>(null);

  const tooBig = (f: File) => {
    if (f.size > MAX_FILE_BYTES) { toast.error(t("errors.fileTooLarge")); return true; }
    return false;
  };
  const locate = () => new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error(t("errors.noGeolocation")));
    navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error(t("errors.locationDenied"))), { enableHighAccuracy: true, timeout: 15000 });
  });

  const startWork = () => run.mutate(async () => {
    const visit = openVisit ?? (await createProviderVisit(jobOrderId, { type: "EXECUTION" }));
    return visit;
  });
  const checkIn = (visitId: number, manual: boolean) => run.mutate(async () => {
    if (manual) await checkinProviderVisit(visitId, { method: "MANUAL", reason: reason.trim() });
    else {
      const pos = await locate();
      await checkinProviderVisit(visitId, { method: "GPS", lat: pos.coords.latitude, lng: pos.coords.longitude });
    }
    if (status === "ACTIVE" || status === "REWORK_REQUIRED") await updateProviderJobOrderStatus(jobOrderId, { status: "IN_PROGRESS" });
    toast.success(t("toasts.started"));
  });
  const saveDraft = async () => {
    if (draft) return (await updateProviderReport(draft.id, values)) as ProviderReportItem;
    return createProviderJobOrderReport(jobOrderId, values as never) as Promise<ProviderReportItem>;
  };
  const missing = !values.findings.trim() || !values.actionsTaken.trim();

  const Step = ({ k, done }: { k: string; done: boolean }) => (
    <li className="flex items-center gap-2 text-sm" data-testid={`step-${k}`} data-done={done}>
      {done ? <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden /> : <Circle className="h-4 w-4 text-muted-foreground" aria-hidden />}
      <span className={done ? "" : "text-muted-foreground"}>{t(`steps.${k}`)}</span>
    </li>
  );

  const showWorkspace = executing && !underReview;
  const readOnlyReason = !canExecute ? t("noPermission") : null;

  return (
    <Card data-testid="provider-execution">
      <CardHeader>
        <CardTitle className="text-base">{t("provider.title")}</CardTitle>
        <ol className="grid gap-1.5 sm:grid-cols-2">{steps.map((s) => <Step key={s.key} k={s.key} done={s.done} />)}</ol>
      </CardHeader>
      <CardContent className="space-y-5">
        {status === "REWORK_REQUIRED" && lastReturned && (
          <div className="rounded border border-destructive/40 bg-destructive/5 p-3 text-sm" data-testid="returned-notice">
            <p className="font-medium text-destructive">{t("provider.returned")}</p>
            <p className="mt-1">{lastReturned.rejectionReason ?? lastReturned.reviewNote}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("provider.returnedHint")}</p>
          </div>
        )}
        {underReview && <p className="text-sm text-muted-foreground" data-testid="under-review-note">{t(`provider.underReview.${review?.reviewStage ?? "AWAITING_MAINTENANCE_MANAGER"}`, { defaultValue: t("provider.underReview.AWAITING_MAINTENANCE_MANAGER") })}</p>}
        {!showWorkspace && !underReview && !executing && <p className="text-sm text-muted-foreground">{t("provider.notExecutable", { status })}</p>}
        {readOnlyReason && showWorkspace && <p className="text-sm text-muted-foreground">{readOnlyReason}</p>}

        {showWorkspace && canExecute && (
          <>
            {/* 1 — operator */}
            <section className="space-y-2" aria-label={t("steps.operator")}>
              <h3 className="flex items-center gap-1 text-sm font-medium"><UserPlus className="h-4 w-4" aria-hidden /> {t("operator.title")}</h3>
              {hasOperator ? (
                <p className="text-sm">{assignedOperators.map((o) => o.name).join(", ")}</p>
              ) : canAssign ? (
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[12rem] flex-1 space-y-1">
                    <Label htmlFor="op-select" className="text-xs">{t("operator.choose")}</Label>
                    <select id="op-select" data-testid="operator-select" value={operatorId} onChange={(e) => setOperatorId(e.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                      <option value="">{t("operator.placeholder")}</option>
                      {(operatorsQ.data ?? []).map((o) => <option key={o.id} value={o.id}>{o.name ?? `#${o.id}`}</option>)}
                    </select>
                  </div>
                  <Button size="sm" disabled={busy || !operatorId} onClick={() => run.mutate(() => assignProviderJobOrderOperator(jobOrderId, { operatorId: Number(operatorId) }))} data-testid="assign-operator">
                    {t("operator.assign")}
                  </Button>
                </div>
              ) : <p className="text-sm text-muted-foreground">{t("operator.waiting")}</p>}
            </section>

            {/* 2 — start work */}
            <section className="space-y-2" aria-label={t("steps.start")}>
              <h3 className="flex items-center gap-1 text-sm font-medium"><Play className="h-4 w-4" aria-hidden /> {t("visit.title")}</h3>
              {!hasOperator ? <p className="text-sm text-muted-foreground">{t("visit.needOperator")}</p> : checkedIn ? (
                <p className="text-sm"><Badge variant="secondary">{t("visit.checkedIn")}</Badge> {checkedIn.visitDate}</p>
              ) : openVisit ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" disabled={busy} onClick={() => checkIn(openVisit.id, false)} data-testid="checkin-gps"><MapPin className="me-1 h-4 w-4" aria-hidden />{t("visit.checkInGps")}</Button>
                  </div>
                  {canManualCheckin && (
                    <div className="flex flex-wrap items-end gap-2">
                      <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("visit.manualReason")} className="h-9 min-w-[12rem] flex-1" />
                      <Button size="sm" variant="outline" disabled={busy || reason.trim().length < 3} onClick={() => checkIn(openVisit.id, true)}>{t("visit.checkInManual")}</Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">{t("visit.mobileHint")}</p>
                </div>
              ) : (
                <Button size="sm" disabled={busy} onClick={startWork} data-testid="start-work"><Play className="me-1 h-4 w-4" aria-hidden />{t("visit.start")}</Button>
              )}
            </section>

            {/* 3 — evidence on the checked-in visit */}
            {checkedIn && (
              <section className="space-y-3" aria-label={t("steps.evidence")}>
                <h3 className="flex items-center gap-1 text-sm font-medium"><Upload className="h-4 w-4" aria-hidden /> {t("evidence.title")}</h3>
                <div className="space-y-1">
                  <Label htmlFor="visit-note" className="text-xs">{t("evidence.notes")}</Label>
                  <Textarea id="visit-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
                  <Button size="sm" variant="outline" disabled={busy || !note.trim()} onClick={() => run.mutate(async () => { await addProviderVisitNote(checkedIn.id, { note: note.trim() }); setNote(""); })}>{t("evidence.addNote")}</Button>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="photo-kind" className="text-xs">{t("evidence.photoKind")}</Label>
                    <select id="photo-kind" value={photoKind} onChange={(e) => setPhotoKind(e.target.value as typeof photoKind)} className="h-9 rounded-md border bg-background px-2 text-sm">
                      <option value="before">{t("evidence.before")}</option>
                      <option value="after">{t("evidence.after")}</option>
                      <option value="other">{t("evidence.other")}</option>
                    </select>
                  </div>
                  <input ref={photoRef} type="file" accept="image/png,image/jpeg,image/webp" className="max-w-[14rem] text-xs" aria-label={t("evidence.photo")} data-testid="visit-photo-input" />
                  <Button size="sm" variant="outline" disabled={busy || !canUpload} onClick={() => {
                    const f = photoRef.current?.files?.[0]; if (!f || tooBig(f)) return;
                    run.mutate(async () => { await uploadProviderVisitPhoto(checkedIn.id, f, photoKind); if (photoRef.current) photoRef.current.value = ""; toast.success(t("toasts.uploaded")); });
                  }}>{t("evidence.uploadPhoto")}</Button>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <input ref={fileRef} type="file" accept="image/*,.pdf,application/pdf" className="max-w-[14rem] text-xs" aria-label={t("evidence.file")} />
                  <Button size="sm" variant="outline" disabled={busy || !canUpload} onClick={() => {
                    const f = fileRef.current?.files?.[0]; if (!f || tooBig(f)) return;
                    run.mutate(async () => { await uploadProviderJobOrderAttachment(jobOrderId, f); if (fileRef.current) fileRef.current.value = ""; toast.success(t("toasts.uploaded")); });
                  }}>{t("evidence.uploadFile")}</Button>
                  <span className="text-[11px] text-muted-foreground">{t("evidence.limits")}</span>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="visit-complete" className="text-xs">{t("evidence.completionNote")}</Label>
                  <Textarea id="visit-complete" rows={2} value={completion} onChange={(e) => setCompletion(e.target.value)} />
                  <Button size="sm" disabled={busy} onClick={() => run.mutate(async () => { await completeProviderVisit(checkedIn.id, { completionNote: completion.trim() || undefined }); setCompletion(""); toast.success(t("toasts.visitCompleted")); })} data-testid="complete-visit">{t("evidence.completeVisit")}</Button>
                </div>
              </section>
            )}

            {/* 4 — final report */}
            {hasCompletedVisit && !checkedIn && canReport && (
              <section className="space-y-3" aria-label={t("steps.report")} data-testid="final-report-form">
                <h3 className="flex items-center gap-1 text-sm font-medium"><Send className="h-4 w-4" aria-hidden /> {t("report.title")}</h3>
                <p className="text-xs text-muted-foreground">{t("report.hint")}</p>
                <div className="space-y-1">
                  <Label htmlFor="rep-findings" className="text-xs">{t("report.findings")} *</Label>
                  <Textarea id="rep-findings" rows={3} value={values.findings} onChange={(e) => setForm({ ...values, findings: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rep-actions" className="text-xs">{t("report.actionsTaken")} *</Label>
                  <Textarea id="rep-actions" rows={3} value={values.actionsTaken} onChange={(e) => setForm({ ...values, actionsTaken: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rep-reco" className="text-xs">{t("report.recommendations")}</Label>
                  <Textarea id="rep-reco" rows={2} value={values.recommendations} onChange={(e) => setForm({ ...values, recommendations: e.target.value })} />
                </div>
                {draft ? (
                  <div className="flex flex-wrap items-end gap-2">
                    <input ref={reportPhotoRef} type="file" accept="image/png,image/jpeg,image/webp" className="max-w-[14rem] text-xs" aria-label={t("report.photo")} />
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => {
                      const f = reportPhotoRef.current?.files?.[0]; if (!f || tooBig(f)) return;
                      run.mutate(async () => { await uploadReportPhoto(draft.id, f, "completion"); if (reportPhotoRef.current) reportPhotoRef.current.value = ""; toast.success(t("toasts.uploaded")); });
                    }}>{t("report.uploadPhoto")}</Button>
                    <span className="text-xs text-muted-foreground">{t("report.photoCount", { count: draft.attachments?.length ?? 0 })}</span>
                  </div>
                ) : <p className="text-xs text-muted-foreground">{t("report.saveFirst")}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={busy || missing} onClick={() => run.mutate(async () => { await saveDraft(); setForm(null); toast.success(t("toasts.draftSaved")); })} data-testid="save-report">{t("report.saveDraft")}</Button>
                  <Button size="sm" disabled={busy || missing || !canSubmit} onClick={() => run.mutate(async () => { const r = await saveDraft(); await submitProviderReport(r.id); setForm(null); toast.success(t("toasts.submitted")); })} data-testid="submit-report">
                    {busy ? <Loader2 className="me-1 h-4 w-4 animate-spin" aria-hidden /> : <Send className="me-1 h-4 w-4" aria-hidden />}{t("report.submit")}
                  </Button>
                </div>
              </section>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

