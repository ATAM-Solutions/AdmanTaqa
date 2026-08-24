import { useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft,   AlertCircle, UserPlus, MapPin, FileText, Paperclip, Check } from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/utils";
import useProviderJobOrderById from "@/hooks/Provider/useProviderJobOrderById";
// import useUpdateProviderJobOrderStatus from "@/hooks/Provider/useUpdateProviderJobOrderStatus";
import useSubmitJobOrderForCompletion from "@/hooks/Provider/useSubmitJobOrderForCompletion";
import useUploadProviderJobOrderAttachment from "@/hooks/Provider/useUploadProviderJobOrderAttachment";
import useProviderJobOrderReports from "@/hooks/Provider/useProviderJobOrderReports";
import type { ProviderJobOrderAssignment, ProviderJobOrderVisit } from "@/types/provider";
import { formatDate } from "@/lib/i18n/formatters";
import { AsyncBoundary } from "@/components/patterns/AsyncBoundary";

export default function ProviderJobOrderDetail() {
  const { t, i18n } = useTranslation("provider");
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading } = useProviderJobOrderById(id ?? null);
  // const statusMutation = useUpdateProviderJobOrderStatus();
  const submitCompletionMutation = useSubmitJobOrderForCompletion();
  const uploadAttachmentMutation = useUploadProviderJobOrderAttachment();
  const attachmentFileRef = useRef<HTMLInputElement>(null);
  const [attachmentDescription, setAttachmentDescription] = useState("");
  const [selectedAttachmentFile, setSelectedAttachmentFile] = useState<File | null>(null);
  const executionAttachments =
    (order as { executionDetails?: { attachments?: Array<{ fileUrl?: string; uploadedAt?: string; description?: string | null }> } })?.executionDetails?.attachments ??
    (order as { ExecutionDetails?: { attachments?: Array<{ fileUrl?: string; uploadedAt?: string; description?: string | null }> } })?.ExecutionDetails?.attachments ??
    [];
  const formData = (order as { externalRequest?: { formData?: { title?: string; priority?: string; description?: string } } })?.externalRequest?.formData
    ?? (order as { ExternalRequest?: { formData?: { title?: string; priority?: string; description?: string } } })?.ExternalRequest?.formData;
  const requestTitle = formData?.title?.trim() || order?.title;
  const requestPriority = formData?.priority?.trim();
  const requestDescription = formData?.description?.trim() || order?.description;

  const orderWithAssignments = order as { externalJobAssignments?: ProviderJobOrderAssignment[]; ExternalJobAssignments?: ProviderJobOrderAssignment[] } | null | undefined;
  const assignmentsRaw = orderWithAssignments?.externalJobAssignments ?? orderWithAssignments?.ExternalJobAssignments ?? [];
  const jobOrderOperatorsList = assignmentsRaw.map((a) => ({ assignmentId: a.id, operator: a.Operator ?? a.operator })).filter((x): x is { assignmentId: number; operator: NonNullable<ProviderJobOrderAssignment["Operator"]> } => x.operator != null);

  const orderWithVisits = order as { externalJobVisits?: ProviderJobOrderVisit[]; ExternalJobVisits?: ProviderJobOrderVisit[] } | null | undefined;
  const jobOrderVisitsList = orderWithVisits?.externalJobVisits ?? orderWithVisits?.ExternalJobVisits ?? [];

  const { data: reportsList = [] } = useProviderJobOrderReports(id);

  const [completionNote, setCompletionNote] = useState("");

  const isCancelled = order?.status === "CANCELLED";
  const paymentRejected = order?.paymentRecord?.status === "REJECTED";
  const isUnderReview = order?.status === "UNDER_REVIEW";
  const isCompleted = order?.status === "COMPLETED" || order?.status === "CLOSED";
  const isCancelledOrder = order?.status === "CANCELLED";
  const isActive = order?.status === "ACTIVE" || order?.status === "IN_PROGRESS" || order?.status === "WAITING_PARTS" || order?.status === "UNDER_REVIEW" || order?.status === "REWORK_REQUIRED";
  const canAssignOrUpdateStatus = (isActive || isCompleted || isCancelledOrder) && !paymentRejected;
  const showOrderActionsAndDetails = canAssignOrUpdateStatus || isCompleted || isCancelledOrder;
  const canSubmitForReview =
    !paymentRejected &&
    !isCancelled &&
    (order?.status === "ACTIVE" ||
      order?.status === "IN_PROGRESS" ||
      order?.status === "WAITING_PARTS" ||
      order?.status === "COMPLETED" ||
      order?.status === "CLOSED") &&
    !isUnderReview;
  const showSubmitForReviewSection = canSubmitForReview || isUnderReview;

  // const handleMarkCompleted = () => {
  //   if (!id) return;
  //   statusMutation.mutate(
  //     { jobOrderId: id, body: { status: "COMPLETED" } },
  //     {
  //       onSuccess: () => toast.success("Status updated to Completed."),
  //       onError: (e) => toast.error(getApiErrorMessage(e, "Update failed.")),
  //     }
  //   );
  // };

  const handleSubmitForReview = () => {
    if (!id) return;
    submitCompletionMutation.mutate(
      { jobOrderId: id, body: completionNote ? { completionNote } : undefined },
      {
        onSuccess: () => toast.success("Job order submitted for station review."),
        onError: (e) => toast.error(getApiErrorMessage(e, "Submit failed.")),
      }
    );
  };
  // Kept for when "Submit for review" / "Attachments" sections are uncommented
  void [
    setCompletionNote,
    showSubmitForReviewSection,
    handleSubmitForReview,
    uploadAttachmentMutation,
    attachmentFileRef,
    attachmentDescription,
    setAttachmentDescription,
    selectedAttachmentFile,
    setSelectedAttachmentFile,
    executionAttachments,
  ];

  return (
    <div className="p-4 md:p-8">
      <AsyncBoundary
        isLoading={isLoading || !id}
        isEmpty={!order}
        loadingFallback={
          <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
            {t("jobOrderDetail.loading")}
          </div>
        }
        emptyFallback={
          <>
            <Button variant="ghost" asChild>
              <Link to="/provider-job-orders">{t("jobOrderDetail.back")}</Link>
            </Button>
            <p className="text-destructive">{t("jobOrderDetail.notFound")}</p>
          </>
        }
      >
        {order && (
    <div className="space-y-6">
      <Button variant="ghost" asChild>
        <Link to="/provider-job-orders" className="gap-2">
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" /> {t("jobOrderDetail.back")}
        </Link>
      </Button>

      {isCancelled && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30">
          <CardContent className="pt-4">
            <p className="font-medium text-amber-800 dark:text-amber-200">{t("jobOrderDetail.cancelled")}</p>
          </CardContent>
        </Card>
      )}

      {paymentRejected && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="font-medium text-destructive">{t("jobOrderDetail.paymentRejected")}</p>
              {order.paymentRecord?.rejectionReason && (
                <p className="text-sm text-muted-foreground mt-1">
                  {order.paymentRecord.rejectionReason}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{requestTitle || t("jobOrderDetail.defaultTitle")}</CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
            {requestPriority && (
              <Badge variant="outline" className="text-xs font-normal">{requestPriority}</Badge>
            )}
            {requestPriority && <span>·</span>}
            <Badge variant="secondary">{order.status}</Badge>
          </div>
          {requestDescription && (
            <p className="text-sm text-muted-foreground mt-2">{requestDescription}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">

          {showOrderActionsAndDetails && (
            <>
              <div className="pt-4 border-t space-y-2">
                <p className="text-sm font-medium flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {t("jobOrderDetail.visits")}
                </p>
                {jobOrderVisitsList.length > 0 ? (
                  <ul className="text-xs space-y-2">
                    {jobOrderVisitsList.map((v) => {
                      const createdBy = (v as { CreatedByUser?: { id?: number; fullName?: string; email?: string } }).CreatedByUser ?? (v as { createdByUser?: { id?: number; fullName?: string; email?: string } }).createdByUser;
                      const operatorUser = (v as { OperatorUser?: { id?: number; fullName?: string; email?: string } }).OperatorUser ?? (v as { operatorUser?: { id?: number; fullName?: string; email?: string } }).operatorUser;
                      return (
                        <li key={v.id} className="rounded border px-3 py-2 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{v.visitDate ?? v.createdAt} — {v.status ?? "—"}</span>
                            {v.notes ? <span className="text-muted-foreground">· {v.notes}</span> : null}
                          </div>
                          {createdBy && (createdBy.fullName || createdBy.email) && (
                            <p className="text-muted-foreground">
                              {t("jobOrderDetail.createdBy", { name: `${createdBy.fullName ?? ""}${createdBy.email ? ` (${createdBy.email})` : ""}` })}
                            </p>
                          )}
                          {operatorUser && (operatorUser.fullName || operatorUser.email) && (
                            <p className="text-muted-foreground">
                              {t("jobOrderDetail.operatorLabel", { name: `${operatorUser.fullName ?? ""}${operatorUser.email ? ` (${operatorUser.email})` : ""}` })}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">{t("jobOrderDetail.noVisits")}</p>
                )}
              </div>
              {executionAttachments.length > 0 && (
              <div className="pt-4 border-t space-y-2">
                <p className="text-sm font-medium flex items-center gap-1">
                  <Paperclip className="h-4 w-4" /> {t("jobOrderDetail.executionAttachments")}
                </p>
                <ul className="text-xs space-y-1.5">
                  {executionAttachments.map((a, i) => (
                    <li key={i} className="flex flex-wrap items-center gap-2">
                      {a.fileUrl ? (
                        <a href={a.fileUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                          {a.description?.trim() || t("jobOrderDetail.attachmentFallback", { index: i + 1 })}
                        </a>
                      ) : (
                        <span>{a.description?.trim() || t("jobOrderDetail.attachmentFallback", { index: i + 1 })}</span>
                      )}
                      {a.uploadedAt && (
                        <span className="text-muted-foreground">
                          {formatDate(a.uploadedAt, i18n.language, { dateStyle: "medium", timeStyle: "short" })}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              )}
              <div className="pt-4 border-t space-y-2">
                <p className="text-sm font-medium flex items-center gap-1">
                  <UserPlus className="h-4 w-4" /> {t("jobOrderDetail.operators")}
                </p>
                {jobOrderOperatorsList.length > 0 ? (
                  <ul className="text-xs space-y-2">
                    {jobOrderOperatorsList.map(({ assignmentId, operator }) => (
                      <li key={assignmentId} className="rounded border px-3 py-2 flex flex-wrap items-center gap-2">
                        <span className="font-medium">{operator.name ?? t("jobOrderDetail.operatorFallback", { id: operator.id })}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">{t("jobOrderDetail.noOperators")}</p>
                )}
              </div>
              <div className="pt-4 border-t space-y-2">
                <p className="text-sm font-medium flex items-center gap-1">
                  <FileText className="h-4 w-4" /> {t("jobOrderDetail.maintenanceReports")}
                </p>
                {reportsList.length > 0 ? (
                  <ul className="text-xs space-y-3">
                    {reportsList.map((r) => (
                      <li key={r.id} className="rounded border px-3 py-2 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{r.title ?? t("jobOrderDetail.reportFallback", { id: r.id })}</span>
                          {r.status != null && r.status !== "" && (
                            <span className="text-muted-foreground">{r.status}</span>
                          )}
                          {r.Visit?.visitDate && (
                            <span className="text-muted-foreground">{t("jobOrderDetail.visitLabel", { date: r.Visit.visitDate })}</span>
                          )}
                          {r.SubmittedBy?.fullName && (
                            <span className="text-muted-foreground">{t("jobOrderDetail.byLabel", { name: r.SubmittedBy.fullName })}</span>
                          )}
                          {r.createdAt && (
                            <span className="text-muted-foreground">
                              {formatDate(r.createdAt, i18n.language, { dateStyle: "medium", timeStyle: "short" })}
                            </span>
                          )}
                          {(r.ReviewedBy?.fullName ?? (r as { reviewedBy?: { fullName?: string } }).reviewedBy?.fullName) && (
                            <span className="text-muted-foreground">
                              {t("jobOrderDetail.reviewedByLabel", { name: r.ReviewedBy?.fullName ?? (r as { reviewedBy?: { fullName?: string } }).reviewedBy?.fullName })}
                            </span>
                          )}
                          {(r.reviewedAt ?? (r as { reviewedAt?: string }).reviewedAt) && (
                            <span className="text-muted-foreground">
                              {formatDate(r.reviewedAt ?? (r as { reviewedAt?: string }).reviewedAt ?? "", i18n.language, { dateStyle: "medium", timeStyle: "short" })}
                            </span>
                          )}
                        </div>
                        {r.findings != null && r.findings !== "" && (
                          <p className="text-muted-foreground"><span className="font-medium text-foreground">{t("jobOrderDetail.findings")}</span> {r.findings}</p>
                        )}
                        {r.actionsTaken != null && r.actionsTaken !== "" && (
                          <p className="text-muted-foreground"><span className="font-medium text-foreground">{t("jobOrderDetail.actionsTaken")}</span> {r.actionsTaken}</p>
                        )}
                        {r.recommendations != null && r.recommendations !== "" && (
                          <p className="text-muted-foreground"><span className="font-medium text-foreground">{t("jobOrderDetail.recommendations")}</span> {r.recommendations}</p>
                        )}
                        {Array.isArray(r.checklistJson) && r.checklistJson.length > 0 && (
                          <div className="pt-1.5">
                            <p className="text-xs font-medium text-foreground mb-1.5">{t("jobOrderDetail.checklist")}</p>
                            <ul className="space-y-1">
                              {r.checklistJson.map((row, idx) => (
                                <li key={idx} className="flex items-center gap-2 text-xs">
                                  {row.checked ? (
                                    <Check className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                                  ) : (
                                    <span className="h-4 w-4 rounded border border-muted-foreground/50 shrink-0" />
                                  )}
                                  <span>{row.item ?? "—"}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {r.attachments != null && r.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {r.attachments.map((a, i) => (
                              a.fileUrl ? (
                                <a key={i} href={a.fileUrl} target="_blank" rel="noreferrer" className="text-primary underline text-xs">
                                  {a.category ?? t("jobOrderDetail.attachmentFallback", { index: i + 1 })}
                                </a>
                              ) : (
                                <span key={i} className="text-muted-foreground text-xs">{a.category ?? t("jobOrderDetail.attachmentFallback", { index: i + 1 })}</span>
                              )
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">{t("jobOrderDetail.noReports")}</p>
                )}
              </div>
              {/* {canAssignOrUpdateStatus && !isCompleted && (
              <div className="pt-4 border-t space-y-2">
                <p className="text-sm font-medium flex items-center gap-1">
                  <RefreshCw className="h-4 w-4" /> Update status
                </p>
                <Button
                  size="sm"
                  onClick={handleMarkCompleted}
                  disabled={statusMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Completed
                </Button>
              </div>
              )} */}
              {/* Submit for station review — commented out
              {!isCompleted && showSubmitForReviewSection && (
                <div className="pt-4 border-t space-y-2">
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Send className="h-4 w-4" /> Submit for station review
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Send this job order to the fuel station for approval (status will move to Under review).
                  </p>
                  <div className="flex flex-wrap gap-2 items-end">
                    <div className="space-y-1 min-w-[200px]">
                      <Label className="text-xs">Completion note (optional)</Label>
                      <Input
                        placeholder="Completion note..."
                        value={completionNote}
                        onChange={(e) => setCompletionNote(e.target.value)}
                        className="h-8"
                        readOnly={isUnderReview}
                      />
                    </div>
                    <Button
                      size="sm"
                      className="gap-1"
                      onClick={handleSubmitForReview}
                      disabled={submitCompletionMutation.isPending || isUnderReview}
                    >
                      <Send className="h-3.5 w-3.5" /> Submit for review
                    </Button>
                  </div>
                </div>
              )}
              */}
              {/* Attachments — commented out
              {!isCompleted && (
              <div className="pt-4 border-t space-y-2">
                <p className="text-sm font-medium flex items-center gap-1">
                  <Paperclip className="h-4 w-4" /> Attachments
                </p>
                {(attachmentsList.length > 0 || executionAttachments.length > 0) ? (
                  <ul className="text-xs space-y-1.5">
                    {attachmentsList.map((a) => {
                      const href = a.url ?? a.fileUrl;
                      const label = a.name ?? a.description?.trim() ?? `Attachment ${a.id}`;
                      return (
                        <li key={a.id} className="flex flex-wrap items-center gap-2">
                          {href ? (
                            <a href={href} target="_blank" rel="noreferrer" className="text-primary underline">
                              {label}
                            </a>
                          ) : (
                            <span>{label}</span>
                          )}
                          {a.createdAt && (
                            <span className="text-muted-foreground">
                              {new Date(a.createdAt).toLocaleString()}
                            </span>
                          )}
                        </li>
                      );
                    })}
                    {executionAttachments.map((a, i) => (
                      <li key={`exec-${i}`} className="flex flex-wrap items-center gap-2">
                        {a.fileUrl ? (
                          <a href={a.fileUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                            {a.description?.trim() || `Attachment ${i + 1}`}
                          </a>
                        ) : (
                          <span>{a.description?.trim() || `Attachment ${i + 1}`}</span>
                        )}
                        {a.uploadedAt && (
                          <span className="text-muted-foreground">
                            {new Date(a.uploadedAt).toLocaleString()}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">No attachments.</p>
                )}
                <div className="rounded border p-3 bg-muted/20 space-y-2">
                  <Label className="text-xs">Upload file or image</Label>
                  <div className="flex flex-wrap items-end gap-2">
                    <Input
                      type="file"
                      ref={attachmentFileRef}
                      accept="image/*,.pdf,application/pdf"
                      className="max-w-[220px] text-xs"
                      onChange={(e) => setSelectedAttachmentFile(e.target.files?.[0] ?? null)}
                    />
                    <Input
                      placeholder="Description (optional)"
                      value={attachmentDescription}
                      onChange={(e) => setAttachmentDescription(e.target.value)}
                      className="h-8 max-w-[180px] text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      disabled={!id || uploadAttachmentMutation.isPending || !selectedAttachmentFile}
                      onClick={() => {
                        if (!id || !selectedAttachmentFile) return;
                        uploadAttachmentMutation.mutate(
                          { jobOrderId: id, file: selectedAttachmentFile, description: attachmentDescription.trim() || undefined },
                          {
                            onSuccess: () => {
                              toast.success("Attachment uploaded.");
                              setAttachmentDescription("");
                              setSelectedAttachmentFile(null);
                              if (attachmentFileRef.current) attachmentFileRef.current.value = "";
                            },
                            onError: (e) => toast.error(getApiErrorMessage(e, "Upload failed.")),
                          }
                        );
                      }}
                    >
                      {uploadAttachmentMutation.isPending ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">PDF or image, max 5 MB.</p>
                </div>
              </div>
              )}
              */}
            </>
          )}
        </CardContent>
      </Card>
    </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
