import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ChevronLeft, Loader2, Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import TaskProgress from "@/components/TaskProgress";
import { DashboardLoadError } from "@/components/DashboardLoadError";
import { useAuth } from "@/context/AuthContext";
import {
  TaskActionError,
  fetchTaskDetail,
  submitTaskReview,
  submitTaskStatus,
  uploadTaskAttachment,
  type TaskDetailData,
  type TaskStatusBody,
} from "@/api/services/taskDetailService";
import { getApiErrorMessage } from "@/lib/utils";
import ReportAttachmentTile from "@/components/ReportAttachmentTile";

type TechAction = {
  id: string;
  target: string;
  /** Free-text field the server needs / accepts for this step. */
  field?: { name: keyof TaskStatusBody; required?: boolean };
  extraField?: { name: keyof TaskStatusBody; required?: boolean };
  variant?: "default" | "outline";
};

/** The established backend workflow, per current status (server enforces the same transitions). */
const TECH_ACTIONS: Record<string, TechAction[]> = {
  ASSIGNED: [{ id: "accept", target: "ACCEPTED" }],
  ACCEPTED: [{ id: "arrive", target: "IN_PROGRESS" }],
  IN_PROGRESS: [
    { id: "inspect", target: "INSPECTING", field: { name: "inspectionNotes", required: true }, variant: "outline" },
    { id: "parts", target: "WAITING_PARTS", field: { name: "message", required: true }, variant: "outline" },
    { id: "pause", target: "PAUSED", variant: "outline" },
    { id: "complete", target: "COMPLETED", field: { name: "completionReport", required: true } },
  ],
  INSPECTING: [
    { id: "resume", target: "IN_PROGRESS", variant: "outline" },
    { id: "parts", target: "WAITING_PARTS", field: { name: "message", required: true }, variant: "outline" },
    { id: "complete", target: "COMPLETED", field: { name: "completionReport", required: true } },
  ],
  PAUSED: [{ id: "resume", target: "IN_PROGRESS" }],
  WAITING_PARTS: [
    { id: "resume", target: "IN_PROGRESS", variant: "outline" },
    { id: "complete", target: "COMPLETED", field: { name: "completionReport", required: true } },
  ],
  COMPLETED: [
    { id: "returnMaterials", target: "RETURNING_MATERIALS", field: { name: "returnReportProblem", required: true }, extraField: { name: "returnReportWorkPerformed", required: true }, variant: "outline" },
    { id: "submitReview", target: "UNDER_REVIEW" },
  ],
  RETURNING_MATERIALS: [{ id: "submitReview", target: "UNDER_REVIEW" }],
};

const STABLE_CODES = [
  "TASK_ALREADY_APPROVED",
  "TASK_NOT_PENDING_APPROVAL",
  "TASK_NOT_REVIEWABLE",
  "TASK_ALREADY_CLOSED",
  "BRANCH_ACCESS_DENIED",
  "INSUFFICIENT_PERMISSIONS",
] as const;

const httpStatusOf = (e: unknown) => (e instanceof TaskActionError ? e.status : null);

export default function TaskDetail() {
  const { t, i18n } = useTranslation("tasks");
  const { id } = useParams<{ id: string }>();
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["internal-task", id];
  const inFlight = useRef(false);
  const [openAction, setOpenAction] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [reviewNote, setReviewNote] = useState("");
  const [uploadCategory] = useState("DURING");

  const taskQuery = useQuery<TaskDetailData, TaskActionError>({
    queryKey,
    queryFn: () => fetchTaskDetail(id as string),
    enabled: !!id,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const task = taskQuery.data;

  const refresh = () => queryClient.invalidateQueries({ queryKey });

  /** One guarded runner for every mutation: no double submit, stale-state errors become a refresh. */
  const run = useMutation({
    mutationFn: async (fn: () => Promise<void>) => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        await fn();
      } finally {
        inFlight.current = false;
      }
    },
    onError: (e) => {
      const code = e instanceof TaskActionError ? e.code : null;
      const known = STABLE_CODES.find((c) => c === code);
      toast.error(known ? t(`errors.${known}`) : getApiErrorMessage(e, t("errors.generic")));
      // 409/403/404 mean our view is stale or we may not act: reload the truth rather than leave old buttons.
      const status = httpStatusOf(e);
      if (status === 409 || status === 403 || status === 404) void refresh();
    },
    onSuccess: async () => {
      setOpenAction(null);
      setFields({});
      setReviewNote("");
      await refresh();
    },
  });
  const busy = run.isPending;

  if (!id) return null;

  const status = httpStatusOf(taskQuery.error);
  const isAssignee = !!task && task.assignedUserId != null && task.assignedUserId === user?.id;
  const canExecute = isAssignee && hasPermission("internal_tasks.update_status");
  const canReview = hasPermission("internal_tasks.review");
  const canUpload = (isAssignee || canReview) && hasPermission("internal_tasks.upload");
  const stationName = task?.station ? (i18n.language.startsWith("ar") ? task.station.nameAr ?? task.station.nameEn : task.station.nameEn ?? task.station.nameAr) : null;

  const techActions = canExecute && task ? TECH_ACTIONS[task.status] ?? [] : [];
  const pendingReview = canReview && task?.status === "PENDING_APPROVAL";
  const submittedReview = canReview && task?.status === "UNDER_REVIEW";
  const alreadyApproved = submittedReview && !!task?.progress?.reviewedAt;

  const doStatus = (a: TechAction) => {
    const body: TaskStatusBody = { status: a.target };
    for (const f of [a.field, a.extraField]) {
      if (f) {
        const v = (fields[`${a.id}.${f.name}`] ?? "").trim();
        if (f.required && !v) return;
        if (v) (body as unknown as Record<string, string>)[f.name] = v;
      }
    }
    run.mutate(() => submitTaskStatus(id, body));
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      <Button variant="ghost" asChild>
        <Link to={task?.order && !canExecute ? `/internal-work-orders/${task.order.id}` : "/my-tasks"} className="gap-2">
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" /> {t("back")}
        </Link>
      </Button>

      {taskQuery.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
        </p>
      ) : taskQuery.isError && !task ? (
        status === 403 || status === 404 ? (
          <p className="text-destructive" role="alert" data-testid="task-no-access">
            {status === 404 ? t("notFound") : t("noAccess")}
          </p>
        ) : (
          <DashboardLoadError error={taskQuery.error} fallbackMessage={t("loadFailed")} onRetry={() => taskQuery.refetch()} />
        )
      ) : task ? (
        <>
          {taskQuery.isError ? (
            <DashboardLoadError error={taskQuery.error} fallbackMessage={t("loadFailed")} onRetry={() => taskQuery.refetch()} hasPreviousData />
          ) : null}

          <Card>
            <CardHeader className="space-y-1">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <CardTitle className="text-xl" dir="auto">{task.order?.title ?? t("untitled", { id: task.id })}</CardTitle>
                <Badge data-testid="task-status" variant="secondary">{t(`status.${task.status}`, { defaultValue: task.status })}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">#{task.id}</p>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <div data-testid="task-station">
                <p className="text-xs text-muted-foreground">{t("fields.station")}</p>
                <p dir="auto">{stationName ?? t("fields.none")}</p>
                {task.station?.address ? <p className="text-xs text-muted-foreground" dir="auto">{task.station.address}</p> : null}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("fields.assignee")}</p>
                <p dir="auto">{task.assignee ?? t("fields.none")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("fields.assignedBy")}</p>
                <p dir="auto">{task.assignedBy ?? t("fields.none")}</p>
              </div>
              {task.order?.id ? (
                <div>
                  <p className="text-xs text-muted-foreground">{t("fields.order")}</p>
                  {!isAssignee || hasPermission("internal_work_orders.review") || hasPermission("internal_tasks.assign") ? (
                    <Link className="underline" to={`/internal-work-orders/${task.order.id}`}>#{task.order.id}</Link>
                  ) : (
                    <p>#{task.order.id}</p>
                  )}
                </div>
              ) : null}
              {task.notes ? (
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">{t("fields.notes")}</p>
                  <p dir="auto">{task.notes}</p>
                </div>
              ) : null}
              {task.completionReport ? (
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">{t("fields.completionReport")}</p>
                  <p dir="auto">{task.completionReport}</p>
                </div>
              ) : null}
              {task.reopenReason && task.status === "IN_PROGRESS" ? (
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">{t("fields.reopenReason")}</p>
                  <p dir="auto">{task.reopenReason}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">{t("progress.title")}</CardTitle></CardHeader>
            <CardContent><TaskProgress progress={task.progress} /></CardContent>
          </Card>

          {(techActions.length > 0 || pendingReview || submittedReview || (canExecute && task.status === "PENDING_APPROVAL")) && (
            <Card>
              <CardHeader><CardTitle className="text-base">{t("actions.title")}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {canExecute && task.status === "PENDING_APPROVAL" ? (
                  <p className="text-sm text-amber-700 dark:text-amber-400" data-testid="task-waiting-manager">{t("actions.waitingManager")}</p>
                ) : null}

                {techActions.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {techActions.map((a) => (
                        <Button
                          key={a.id}
                          size="sm"
                          variant={a.variant ?? "default"}
                          disabled={busy}
                          data-testid={`action-${a.id}`}
                          onClick={() => (a.field ? setOpenAction(openAction === a.id ? null : a.id) : doStatus(a))}
                        >
                          {t(`actions.${a.id}`)}
                        </Button>
                      ))}
                    </div>
                    {techActions
                      .filter((a) => a.field && openAction === a.id)
                      .map((a) => (
                        <div key={a.id} className="space-y-3 rounded-md border p-3" data-testid={`form-${a.id}`}>
                          {[a.field, a.extraField].filter(Boolean).map((f) => (
                            <div key={f!.name} className="space-y-1">
                              <Label htmlFor={`${a.id}-${f!.name}`}>{t(`fieldLabels.${f!.name}`)}</Label>
                              <Textarea
                                id={`${a.id}-${f!.name}`}
                                dir="auto"
                                value={fields[`${a.id}.${f!.name}`] ?? ""}
                                onChange={(e) => setFields((p) => ({ ...p, [`${a.id}.${f!.name}`]: e.target.value }))}
                                maxLength={2000}
                              />
                            </div>
                          ))}
                          <Button
                            size="sm"
                            disabled={
                              busy ||
                              [a.field, a.extraField].some((f) => f?.required && !(fields[`${a.id}.${f.name}`] ?? "").trim())
                            }
                            onClick={() => doStatus(a)}
                            data-testid={`submit-${a.id}`}
                          >
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t(`actions.${a.id}Submit`)}
                          </Button>
                        </div>
                      ))}
                  </div>
                ) : null}

                {pendingReview || submittedReview ? (
                  <div className="space-y-3" data-testid="review-panel">
                    <p className="text-sm">
                      {pendingReview
                        ? t("review.pendingPrompt", { stage: task.pendingStatus ? t(`status.${task.pendingStatus}`, { defaultValue: task.pendingStatus }) : "" })
                        : alreadyApproved
                          ? t("review.alreadyApproved")
                          : t("review.submittedPrompt")}
                    </p>
                    <div className="space-y-1">
                      <Label htmlFor="review-note">{t("review.note")}</Label>
                      <Textarea id="review-note" dir="auto" value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} maxLength={2000} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!alreadyApproved ? (
                        <Button
                          size="sm"
                          disabled={busy}
                          data-testid="review-approve"
                          onClick={() =>
                            run.mutate(() =>
                              submitTaskReview(
                                id,
                                pendingReview
                                  ? { kind: "pending", decision: "APPROVE_UPDATE", message: reviewNote.trim() || undefined }
                                  : { kind: "submitted", decision: "APPROVE", message: reviewNote.trim() || undefined }
                              )
                            )
                          }
                        >
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("review.approve")}
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy}
                        data-testid="review-reject"
                        onClick={() =>
                          run.mutate(() =>
                            submitTaskReview(
                              id,
                              pendingReview
                                ? { kind: "pending", decision: "REJECT_UPDATE", message: reviewNote.trim() || undefined }
                                : { kind: "submitted", decision: "REJECT", message: reviewNote.trim() || undefined, reopenReason: reviewNote.trim() || undefined }
                            )
                          )
                        }
                      >
                        {t("review.reject")}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-base">{t("attachments.title")}</CardTitle>
              {canUpload ? (
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm underline">
                  <Paperclip className="h-4 w-4" />
                  {t("attachments.add")}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="sr-only"
                    data-testid="attachment-input"
                    disabled={busy}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) run.mutate(() => uploadTaskAttachment(id, file, uploadCategory));
                    }}
                  />
                </label>
              ) : null}
            </CardHeader>
            <CardContent>
              {task.attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="attachments-empty">{t("attachments.empty")}</p>
              ) : (
                <ul className="flex flex-wrap gap-3" data-testid="attachments-list">
                  {task.attachments.map((a) => (
                    <li key={a.id}>
                      <ReportAttachmentTile
                        attachment={{ id: a.id, fileUrl: a.url ?? "", fileType: a.fileType ?? "OTHER", caption: a.caption }}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">{t("activity.title")}</CardTitle></CardHeader>
            <CardContent>
              {task.activity.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="activity-empty">{t("activity.empty")}</p>
              ) : (
                <ul className="space-y-3" data-testid="activity-list">
                  {task.activity.map((u) => (
                    <li key={u.id} className="border-s-2 ps-3 text-sm">
                      <p dir="auto">
                        {u.newStatus ? <Badge variant="outline" className="me-2">{t(`status.${u.newStatus}`, { defaultValue: u.newStatus })}</Badge> : null}
                        {u.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {u.by ?? t("fields.none")} · {u.createdAt ? new Date(u.createdAt).toLocaleString(i18n.language, { dateStyle: "medium", timeStyle: "short" }) : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
