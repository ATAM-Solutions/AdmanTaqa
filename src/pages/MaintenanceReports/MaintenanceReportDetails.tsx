import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AsyncBoundary } from "@/components/patterns";
import BranchSelect from "@/components/BranchSelect";
import ReportAttachmentTile from "@/components/ReportAttachmentTile";
import { ReportPriorityBadge, ReportStatusBadge } from "@/components/MaintenanceReportBadges";
import { useAuth } from "@/context/AuthContext";
import useMaintenanceReportById from "@/hooks/MaintenanceReports/useMaintenanceReportById";
import { useDecideReport, useOpsApprove, useSupervisorReview } from "@/hooks/MaintenanceReports/useReportActions";
import { formatDate } from "@/lib/i18n/formatters";
import { getBranchDisplayName } from "@/lib/company";
import { getApiErrorMessage } from "@/lib/utils";
import type { MaintenanceReport, ReportDecision } from "@/types/maintenanceReport";

type StepAction = "approve" | "reject";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}

export default function MaintenanceReportDetails() {
  const { t, i18n } = useTranslation("maintenanceReports");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { data: report, isLoading, error, refetch } = useMaintenanceReportById(id);

  const [stepDialog, setStepDialog] = useState<null | { kind: "supervisor" | "ops"; action: StepAction }>(null);
  const [decideOpen, setDecideOpen] = useState(false);

  const when = (value?: string | null) =>
    value ? formatDate(value, i18n.language, { dateStyle: "medium", timeStyle: "short" }) : "—";

  return (
    <div className="p-4 md:p-8 space-y-6">
      <AsyncBoundary
        isLoading={isLoading}
        error={error}
        loadingFallback={<p className="text-sm text-muted-foreground">{t("details.loading")}</p>}
        errorFallback={
          <div className="space-y-3" role="alert">
            <Button variant="ghost" onClick={() => navigate("/maintenance-reports")}>
              <ChevronLeft className="me-2 h-4 w-4 rtl:rotate-180" />
              {t("details.back")}
            </Button>
            <p className="text-destructive">{t("details.loadFailed")}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {t("list.retry")}
            </Button>
          </div>
        }
      >
        {report && (
          <>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate("/maintenance-reports")} aria-label={t("details.back")}>
                  <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
                </Button>
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold tracking-tight">{report.title}</h1>
                  <div className="flex flex-wrap items-center gap-2">
                    <ReportStatusBadge status={report.status} />
                    <ReportPriorityBadge priority={report.priority} />
                    <span className="font-mono text-xs text-muted-foreground" dir="ltr">#{report.id}</span>
                  </div>
                </div>
              </div>
              <ReportActions
                report={report}
                canSupervisor={hasPermission("maintenance_issues.supervisor_review")}
                canOps={hasPermission("maintenance_issues.ops_approve")}
                canDecide={hasPermission("maintenance_issues.decide")}
                onStep={(kind, action) => setStepDialog({ kind, action })}
                onDecide={() => setDecideOpen(true)}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">{t("details.info")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <Field label={t("fields.branch")}>
                      {report.Branch ? getBranchDisplayName(report.Branch, i18n.language) : t("fields.noBranch")}
                    </Field>
                    <Field label={t("fields.asset")}>{report.Asset?.name ?? "—"}</Field>
                    <Field label={t("fields.category")}>{report.category ? t(`category.${report.category}`) : "—"}</Field>
                    <Field label={t("fields.location")}>{report.location || "—"}</Field>
                    <Field label={t("details.submittedBy")}>{report.SubmittedByUser?.fullName ?? "—"}</Field>
                    <Field label={t("details.createdAt")}>{when(report.createdAt)}</Field>
                  </div>
                  <Field label={t("fields.description")}>
                    <p className="whitespace-pre-wrap">{report.description || "—"}</p>
                  </Field>
                  {(report.InternalWorkOrder || report.ExternalRequest) && (
                    <Field label={t("details.outcome")}>
                      {report.InternalWorkOrder && (
                        <Link className="text-primary hover:underline" to={`/internal-work-orders/${report.InternalWorkOrder.id}`}>
                          {t("details.internalWorkOrderLink", { id: report.InternalWorkOrder.id })}
                        </Link>
                      )}
                      {report.ExternalRequest && (
                        <Link className="text-primary hover:underline" to={`/station-requests/${report.ExternalRequest.id}`}>
                          {t("details.externalRequestLink", { id: report.ExternalRequest.id })}
                        </Link>
                      )}
                    </Field>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t("details.attachments")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(report.MaintenanceIssueAttachments ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("details.noAttachments")}</p>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {(report.MaintenanceIssueAttachments ?? []).map((a) => (
                          <ReportAttachmentTile key={a.id} attachment={a} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t("details.timeline")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <TimelineRow label={t("details.tlSubmitted")} who={report.SubmittedByUser?.fullName} at={when(report.createdAt)} />
                    {report.supervisorReviewedAt && (
                      <TimelineRow label={t("details.tlSupervisor")} who={report.SupervisorReviewedByUser?.fullName} at={when(report.supervisorReviewedAt)} note={report.supervisorNote} />
                    )}
                    {report.opsApprovedAt && (
                      <TimelineRow label={t("details.tlOps")} who={report.OpsApprovedByUser?.fullName} at={when(report.opsApprovedAt)} note={report.opsNote} />
                    )}
                    {report.decidedAt && (
                      <TimelineRow
                        label={report.decisionType === "EXTERNAL" ? t("details.tlDecidedExternal") : t("details.tlDecidedInternal")}
                        who={report.DecidedByUser?.fullName}
                        at={when(report.decidedAt)}
                        note={report.decisionNote}
                      />
                    )}
                    {report.rejectedAt && (
                      <TimelineRow label={t("details.tlRejected")} who={report.RejectedByUser?.fullName} at={when(report.rejectedAt)} note={report.rejectionNote} />
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            <StepDialog report={report} state={stepDialog} onClose={() => setStepDialog(null)} />
            <DecideDialog report={report} open={decideOpen} onOpenChange={setDecideOpen} />
          </>
        )}
      </AsyncBoundary>
    </div>
  );
}

function TimelineRow({ label, who, at, note }: { label: string; who?: string | null; at: string; note?: string | null }) {
  return (
    <div className="border-s-2 border-primary/30 ps-3">
      <p className="font-semibold">{label}</p>
      <p className="text-xs text-muted-foreground">
        {who ? `${who} • ` : ""}
        {at}
      </p>
      {note ? <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{note}</p> : null}
    </div>
  );
}

function ReportActions({
  report,
  canSupervisor,
  canOps,
  canDecide,
  onStep,
  onDecide,
}: {
  report: MaintenanceReport;
  canSupervisor: boolean;
  canOps: boolean;
  canDecide: boolean;
  onStep: (kind: "supervisor" | "ops", action: StepAction) => void;
  onDecide: () => void;
}) {
  const { t } = useTranslation("maintenanceReports");
  return (
    <div className="flex flex-wrap gap-2">
      {canSupervisor && report.status === "SUBMITTED" && (
        <>
          <Button onClick={() => onStep("supervisor", "approve")}>{t("actions.supervisorApprove")}</Button>
          <Button variant="destructive" onClick={() => onStep("supervisor", "reject")}>{t("actions.reject")}</Button>
        </>
      )}
      {canOps && report.status === "SUPERVISOR_APPROVED" && (
        <>
          <Button onClick={() => onStep("ops", "approve")}>{t("actions.opsApprove")}</Button>
          <Button variant="destructive" onClick={() => onStep("ops", "reject")}>{t("actions.reject")}</Button>
        </>
      )}
      {canDecide && report.status === "OPS_APPROVED" && <Button onClick={onDecide}>{t("actions.decide")}</Button>}
    </div>
  );
}

function StepDialog({
  report,
  state,
  onClose,
}: {
  report: MaintenanceReport;
  state: null | { kind: "supervisor" | "ops"; action: StepAction };
  onClose: () => void;
}) {
  const { t } = useTranslation("maintenanceReports");
  const supervisor = useSupervisorReview(report.id);
  const ops = useOpsApprove(report.id);
  const [note, setNote] = useState("");
  const mutation = state?.kind === "ops" ? ops : supervisor;

  const submit = () => {
    if (!state) return;
    mutation.mutate(
      { action: state.action, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(t("actions.done"));
          setNote("");
          onClose();
        },
        onError: (err) => toast.error(getApiErrorMessage(err, t("actions.failed"))),
      }
    );
  };

  return (
    <Dialog open={state != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{state?.action === "reject" ? t("actions.rejectTitle") : t("actions.approveTitle")}</DialogTitle>
          <DialogDescription>{report.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="step-note">{t("actions.note")}</Label>
          <Textarea id="step-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>{t("create.cancel")}</Button>
          <Button variant={state?.action === "reject" ? "destructive" : "default"} onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("actions.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DecideDialog({
  report,
  open,
  onOpenChange,
}: {
  report: MaintenanceReport;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("maintenanceReports");
  const decide = useDecideReport(report.id);
  const [decision, setDecision] = useState<ReportDecision>("INTERNAL");
  const [branchId, setBranchId] = useState("");
  const [note, setNote] = useState("");

  // A report with no branch can only go external once a branch is chosen; a report that already
  // has one keeps it (the server rejects a different branch).
  const needsBranch = decision === "EXTERNAL" && !report.branchId;
  const canSubmit = !decide.isPending && (!needsBranch || !!branchId);

  const submit = () => {
    decide.mutate(
      {
        decision,
        note: note.trim() || undefined,
        branchId: needsBranch ? Number(branchId) : undefined,
      },
      {
        onSuccess: () => {
          toast.success(t("actions.done"));
          onOpenChange(false);
        },
        onError: (err) => toast.error(getApiErrorMessage(err, t("actions.failed"))),
      }
    );
  };

  const options: { value: ReportDecision; label: string }[] = [
    { value: "INTERNAL", label: t("decide.internal") },
    { value: "EXTERNAL", label: t("decide.external") },
    { value: "reject", label: t("decide.reject") },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("decide.title")}</DialogTitle>
          <DialogDescription>{report.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("decide.title")}>
            {options.map((o) => (
              <Button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={decision === o.value}
                variant={decision === o.value ? (o.value === "reject" ? "destructive" : "default") : "outline"}
                size="sm"
                onClick={() => setDecision(o.value)}
              >
                {o.label}
              </Button>
            ))}
          </div>
          {needsBranch && (
            <div className="space-y-2">
              <Label htmlFor="decide-branch">{t("decide.branchLabel")}</Label>
              <p className="text-xs text-muted-foreground">{t("decide.branchHint")}</p>
              <BranchSelect id="decide-branch" value={branchId} onValueChange={setBranchId} placeholder={t("create.selectBranch")} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="decide-note">{t("actions.note")}</Label>
            <Textarea id="decide-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={decide.isPending}>{t("create.cancel")}</Button>
          <Button variant={decision === "reject" ? "destructive" : "default"} onClick={submit} disabled={!canSubmit}>
            {decide.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("actions.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
