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
import ActivityTimeline from "@/components/ActivityTimeline";
import useUploadReportAttachments from "@/hooks/MaintenanceReports/useUploadReportAttachments";
import { checkReportFile, REPORT_ACCEPTED_TYPES, REPORT_MAX_FILES } from "@/lib/reportAttachments";
import { ReportPriorityBadge, ReportStatusBadge } from "@/components/MaintenanceReportBadges";
import { useAuth } from "@/context/AuthContext";
import useMaintenanceReportById from "@/hooks/MaintenanceReports/useMaintenanceReportById";
import { useDecideReport, useOpsApprove, useSupervisorReview, useUpdateReport } from "@/hooks/MaintenanceReports/useReportActions";
import { ReportWorkflowStepper } from "@/components/ReportWorkflowStepper";
import useGetAssets from "@/hooks/Assets/useGetAssets";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MAINTENANCE_REPORT_CATEGORIES, MAINTENANCE_REPORT_PRIORITIES, type MaintenanceReportCategory, type MaintenanceReportPriority } from "@/types/maintenanceReport";
import { formatDate } from "@/lib/i18n/formatters";
import { getBranchDisplayName } from "@/lib/company";
import { getApiErrorMessage } from "@/lib/utils";
import type { MaintenanceReport, ReportDecision } from "@/types/maintenanceReport";
import type { UpdateReportBody } from "@/api/services/maintenanceReportService";

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
  const { hasPermission, user: currentUser } = useAuth();
  const { data: report, isLoading, error, refetch } = useMaintenanceReportById(id);

  const [stepDialog, setStepDialog] = useState<null | { kind: "supervisor" | "ops"; action: StepAction }>(null);
  const [decideOpen, setDecideOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const uploadFiles = useUploadReportAttachments(id ?? "");

  const attachmentCount = (report?.MaintenanceIssueAttachments ?? []).length;
  // Mirrors the server rule: only the person who filed the report, only until it is reviewed.
  const canAddFiles =
    report?.status === "SUBMITTED" &&
    report.submittedByUserId != null &&
    report.submittedByUserId === currentUser?.id &&
    hasPermission("maintenance_issues.create");

  const handleAddFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const accepted: File[] = [];
    for (const file of Array.from(list)) {
      const problem = checkReportFile(file, attachmentCount + accepted.length);
      if (problem === "type") toast.error(t("create.fileTypeRejected", { name: file.name }));
      else if (problem === "size") toast.error(t("create.fileTooLarge", { name: file.name }));
      else if (problem === "limit") toast.error(t("create.tooManyFiles", { count: REPORT_MAX_FILES }));
      else accepted.push(file);
    }
    if (accepted.length === 0) return;
    uploadFiles.mutate(accepted, {
      onSuccess: ({ uploaded, failed }) => {
        if (uploaded > 0) toast.success(t("details.filesAdded", { count: uploaded }));
        failed.forEach((f) => toast.error(`${f.name}: ${f.message}`));
        refetch();
      },
      onError: (err) => toast.error(getApiErrorMessage(err, t("details.filesAddFailed"))),
    });
  };

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
              <div className="flex flex-wrap items-start gap-2">
                {report.status === "SUBMITTED" &&
                  report.submittedByUserId != null &&
                  report.submittedByUserId === currentUser?.id &&
                  hasPermission("maintenance_issues.create") && (
                    <Button variant="outline" onClick={() => setEditOpen(true)}>
                      {t("edit.button")}
                    </Button>
                  )}
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

            <ReportWorkflowStepper report={report} />

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
                    {canAddFiles ? (
                      <div className="mt-4 space-y-2 border-t pt-4">
                        <Label htmlFor="report-add-files">{t("details.addFiles")}</Label>
                        <Input
                          id="report-add-files"
                          type="file"
                          multiple
                          accept={REPORT_ACCEPTED_TYPES.join(",")}
                          disabled={uploadFiles.isPending || attachmentCount >= REPORT_MAX_FILES}
                          onChange={(e) => {
                            handleAddFiles(e.target.files);
                            e.target.value = "";
                          }}
                        />
                        <p className="text-xs text-muted-foreground">
                          {attachmentCount >= REPORT_MAX_FILES
                            ? t("details.filesLimitReached", { count: REPORT_MAX_FILES })
                            : t("details.addFilesHint", { count: REPORT_MAX_FILES - attachmentCount })}
                        </p>
                        {uploadFiles.isPending && <p className="text-xs text-muted-foreground">{t("details.uploading")}</p>}
                      </div>
                    ) : report.status !== "SUBMITTED" && (report.MaintenanceIssueAttachments ?? []).length > 0 ? (
                      <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">{t("details.filesLocked")}</p>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t("details.timeline")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* every step with who, when, its comment or rejection reason, the status change and the files */}
                    <ActivityTimeline root="report" id={report.id} />
                  </CardContent>
                </Card>
              </div>
            </div>

            <EditDialog report={report} open={editOpen} onOpenChange={setEditOpen} onStale={() => refetch()} />
            <StepDialog report={report} state={stepDialog} onClose={() => setStepDialog(null)} onStale={() => refetch()} />
            <DecideDialog report={report} open={decideOpen} onOpenChange={setDecideOpen} onStale={() => refetch()} />
          </>
        )}
      </AsyncBoundary>
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

/** Stable code from the API error envelope. */
const errorCode = (err: unknown): string | null => {
  const code = (err as { response?: { data?: { code?: unknown } } })?.response?.data?.code;
  return typeof code === "string" ? code : null;
};

function StepDialog({
  report,
  state,
  onClose,
  onStale,
}: {
  report: MaintenanceReport;
  state: null | { kind: "supervisor" | "ops"; action: StepAction };
  onClose: () => void;
  onStale: () => void;
}) {
  const { t } = useTranslation("maintenanceReports");
  const supervisor = useSupervisorReview(report.id);
  const ops = useOpsApprove(report.id);
  const [note, setNote] = useState("");
  const mutation = state?.kind === "ops" ? ops : supervisor;

  const submit = () => {
    if (!state) return;
    mutation.mutate(
      { action: state.action, note: note.trim() || undefined, expectedRevision: report.revision },
      {
        onSuccess: () => {
          toast.success(t("actions.done"));
          setNote("");
          onClose();
        },
        onError: (err) => {
          if (errorCode(err) === "REPORT_CHANGED") {
            toast.error(t("edit.changedWhileReviewing"));
            onClose();
            onStale();
            return;
          }
          toast.error(getApiErrorMessage(err, t("actions.failed")));
        },
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
  onStale,
}: {
  report: MaintenanceReport;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStale: () => void;
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
        expectedRevision: report.revision,
      },
      {
        onSuccess: () => {
          toast.success(t("actions.done"));
          onOpenChange(false);
        },
        onError: (err) => {
          if (errorCode(err) === "REPORT_CHANGED") {
            toast.error(t("edit.changedWhileReviewing"));
            onOpenChange(false);
            onStale();
            return;
          }
          toast.error(getApiErrorMessage(err, t("actions.failed")));
        },
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

function EditDialog({
  report,
  open,
  onOpenChange,
  onStale,
}: {
  report: MaintenanceReport;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStale: () => void;
}) {
  const { t, i18n } = useTranslation("maintenanceReports");
  const update = useUpdateReport(report.id);
  const [title, setTitle] = useState(report.title);
  const [description, setDescription] = useState(report.description ?? "");
  const [category, setCategory] = useState<MaintenanceReportCategory | "">(report.category ?? "");
  const [priority, setPriority] = useState<MaintenanceReportPriority>(report.priority);
  const [location, setLocation] = useState(report.location ?? "");
  const [assetId, setAssetId] = useState(report.assetId != null ? String(report.assetId) : "");
  const { data: assets = [], isLoading: assetsLoading, isError: assetsFailed, refetch: refetchAssets } = useGetAssets({
    branchId: report.branchId ?? undefined,
  });
  const hasStation = report.branchId != null;

  // Re-seed the form from the freshly fetched report each time the dialog opens.
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setTitle(report.title);
      setDescription(report.description ?? "");
      setCategory(report.category ?? "");
      setPriority(report.priority);
      setLocation(report.location ?? "");
      setAssetId(report.assetId != null ? String(report.assetId) : "");
    }
    onOpenChange(next);
  };

  const submit = () => {
    if (!title.trim()) {
      toast.error(t("create.titleRequired"));
      return;
    }
    const body: UpdateReportBody = { expectedRevision: report.revision };
    if (title.trim() !== report.title) body.title = title.trim();
    if ((description.trim() || null) !== (report.description ?? null)) body.description = description.trim() || null;
    if ((category || null) !== (report.category ?? null)) body.category = category || null;
    if ((location.trim() || null) !== (report.location ?? null)) body.location = location.trim() || null;
    if (priority !== report.priority) body.priority = priority;
    const nextAsset = assetId ? Number(assetId) : null;
    if (nextAsset !== (report.assetId ?? null)) body.assetId = nextAsset;
    if (Object.keys(body).length === 1) {
      toast.info(t("edit.noChanges"));
      return;
    }
    update.mutate(body, {
      onSuccess: () => {
        toast.success(t("edit.saved"));
        onOpenChange(false);
      },
      onError: (err) => {
        const code = errorCode(err);
        if (code === "REPORT_CHANGED" || code === "REPORT_NOT_EDITABLE") {
          toast.error(code === "REPORT_NOT_EDITABLE" ? t("edit.notEditable") : t("edit.changed"));
          onOpenChange(false);
          onStale();
          return;
        }
        if (code === "REPORT_EDIT_NOT_ALLOWED") {
          toast.error(t("edit.notAllowed"));
          return;
        }
        if (code === "ASSET_BRANCH_MISMATCH") {
          toast.error(t("edit.assetMismatch"));
          return;
        }
        toast.error(getApiErrorMessage(err, t("edit.failed")));
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("edit.title")}</DialogTitle>
          <DialogDescription>{t("edit.description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">{t("fields.title")}</Label>
            <Input id="edit-title" value={title} maxLength={255} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">{t("fields.description")}</Label>
            <Textarea id="edit-description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("fields.branch")}</Label>
            <p className="text-sm text-muted-foreground" dir="auto">
              {report.Branch ? getBranchDisplayName(report.Branch, i18n.language) : t("fields.noBranch")} — {t("edit.stationLocked")}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-asset">{t("fields.asset")}</Label>
            {!hasStation ? (
              <p className="text-sm text-muted-foreground">{t("edit.noStationNoAsset")}</p>
            ) : assetsLoading ? (
              <p className="text-sm text-muted-foreground">{t("create.assetsLoading")}</p>
            ) : assetsFailed ? (
              <div className="flex items-center gap-3 text-sm text-destructive" role="alert">
                <span>{t("create.assetsLoadFailed")}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => refetchAssets()}>
                  {t("list.retry")}
                </Button>
              </div>
            ) : assets.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("create.assetsEmpty")}</p>
            ) : (
              <Select value={assetId || "__none__"} onValueChange={(v) => setAssetId(v === "__none__" ? "" : v)}>
                <SelectTrigger id="edit-asset">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("create.noAsset")}</SelectItem>
                  {assets.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name ?? a.nameEn ?? a.nameAr ?? `#${a.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-category">{t("fields.category")}</Label>
              <Select value={category || "__none__"} onValueChange={(v) => setCategory(v === "__none__" ? "" : (v as MaintenanceReportCategory))}>
                <SelectTrigger id="edit-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("create.noCategory")}</SelectItem>
                  {MAINTENANCE_REPORT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(`category.${c}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("fields.priority")}</Label>
              <div className="flex gap-2">
                {MAINTENANCE_REPORT_PRIORITIES.map((p) => (
                  <Button key={p} type="button" variant={priority === p ? "default" : "outline"} size="sm" onClick={() => setPriority(p)}>
                    {t(`priority.${p}`)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-location">{t("fields.location")}</Label>
            <Input id="edit-location" value={location} maxLength={500} onChange={(e) => setLocation(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>{t("create.cancel")}</Button>
          <Button onClick={submit} disabled={update.isPending}>
            {update.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("edit.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
