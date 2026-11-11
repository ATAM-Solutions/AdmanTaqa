import { useTranslation } from "react-i18next";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, UserPlus, UserCog, FileText } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { closeInternalTask } from "@/api/services/internalTaskService";
import { useAuth } from "@/context/AuthContext";
import AssignWorkerDialog from "./AssignWorkerDialog";
import TaskProgress from "@/components/TaskProgress";
import SourceReportAttachments from "@/components/SourceReportAttachments";
import ActivityTimeline from "@/components/ActivityTimeline";
import SparePartRequestsPanel from "@/components/warehouse/SparePartRequestsPanel";
import useInternalWorkOrderById from "@/hooks/Station/useInternalWorkOrderById";
import InternalReviewChainPanel from "@/components/internal/InternalReviewChainPanel";

export default function InternalWorkOrderDetail() {
  const { t } = useTranslation("station");
  const { t: tTasks } = useTranslation("tasks");
  const { t: tCommon } = useTranslation("common");
  const { t: tActivity } = useTranslation("activity");
  const { t: tReport } = useTranslation("finalReport");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading, error } = useInternalWorkOrderById(id ?? null);
  const forbidden = (error as { response?: { status?: number } } | null)?.response?.status === 403;
  const { hasPermission } = useAuth();
  const [assignTarget, setAssignTarget] = useState<{ taskId: number | null; assignedUserId?: number | null; name?: string | null } | null>(null);

  const orderOpenForWork = order != null && order.status !== "CLOSED" && order.status !== "CANCELLED";
  const qc = useQueryClient();
  const closePlaceholder = useMutation({
    mutationFn: (taskId: number) => closeInternalTask(taskId),
    onSuccess: async () => {
      toast.success(t("assignWorker.toasts.placeholderClosed"));
      await qc.invalidateQueries({ queryKey: ["internal-work-order"] });
      await qc.invalidateQueries({ queryKey: ["internal-work-orders"] });
    },
    onError: () => toast.error(t("assignWorker.errors.generic")),
  });
  const canAssign = orderOpenForWork && hasPermission("internal_tasks.assign");
  // Once a worker holds an open task, the header "Assign worker" goes away; "Reassign" on the task row remains.
  const hasActiveAssignee = (order?.tasks ?? []).some((task) => task.assignedUserId != null && task.status !== "CLOSED");

  return (
    <div className="p-4 md:p-8">
      {isLoading || !id ? (
        <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
          {t("loading")}
        </div>
      ) : !order ? (
        <>
          <Button variant="ghost" onClick={() => navigate("/internal-work-orders")} className="mb-4">
            <ChevronLeft className="h-4 w-4 me-2 rtl:rotate-180" /> {t("back")}
          </Button>
          <p className="text-destructive" role="alert">
            {forbidden ? t("internalWorkOrders.detail.noAccess") : t("internalWorkOrders.detail.notFound")}
          </p>
        </>
      ) : (
    <div className="space-y-6">
      <Button variant="ghost" asChild>
        <Link to="/internal-work-orders" className="gap-2">
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" /> {t("back")}
        </Link>
      </Button>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{order.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t("internalWorkOrders.detail.idLabel", { id: order.id })} <Badge variant="secondary" data-testid="order-status">{t(`internalWorkOrders.statusLabels.${order.status}`, { defaultValue: order.status })}</Badge>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canAssign && !hasActiveAssignee && (
              <Button size="sm" onClick={() => setAssignTarget({ taskId: null })} className="gap-1">
                <UserPlus className="h-4 w-4" /> {t("assignWorker.open")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {order.description && <p className="text-sm">{order.description}</p>}
        </CardContent>
      </Card>
      <InternalReviewChainPanel order={order} />
      {order.sourceReport && (
        <Card>
          <CardHeader>
            <CardTitle>{tCommon("sourceReport.title")}</CardTitle>
            <p className="text-sm text-muted-foreground">{tCommon("sourceReport.hint")}</p>
          </CardHeader>
          <CardContent>
            {order.sourceReport.attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tCommon("sourceReport.none")}</p>
            ) : (
              <SourceReportAttachments attachments={order.sourceReport.attachments} />
            )}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>{t("assignWorker.tasksTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!order.tasks || order.tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("assignWorker.noTasks")}</p>
          ) : (
            <ul className="divide-y">
              {order.tasks.map((task) => (
                <li key={task.id} className="space-y-4 py-4" data-testid="order-task">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium" dir="auto">
                        {task.assignedUser?.fullName ?? t("assignWorker.unassigned")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        #{task.id} · <Badge variant="outline" data-testid="order-task-status">{task.status ? tTasks(`status.${!task.assignedUserId && (task.status === "ASSIGNED" || task.status === "PENDING_ASSIGNMENT") ? "PENDING_ASSIGNMENT" : task.status}`, { defaultValue: task.status }) : "—"}</Badge>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {canAssign && task.status !== "CLOSED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() =>
                            setAssignTarget({
                              taskId: task.id,
                              assignedUserId: task.assignedUserId ?? null,
                              name: task.assignedUser?.fullName ?? null,
                            })
                          }
                        >
                          <UserCog className="h-4 w-4" />
                          {task.assignedUserId ? t("assignWorker.reassign") : t("assignWorker.assign")}
                        </Button>
                      )}
                      {orderOpenForWork && !task.assignedUserId && task.status !== "CLOSED" && hasPermission("internal_tasks.close") && (
                        <Button size="sm" variant="ghost" className="gap-1 text-destructive" disabled={closePlaceholder.isPending} data-testid="close-unassigned-task" onClick={() => closePlaceholder.mutate(task.id)}>
                          {t("assignWorker.closePlaceholder")}
                        </Button>
                      )}
                      {hasPermission("internal_tasks.read") && (
                        <Button asChild size="sm" variant="outline" className="gap-1">
                          <Link to={`/internal-tasks/${task.id}`} data-testid="open-task">{tTasks("open")}</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                  {task.progress ? <TaskProgress progress={task.progress} compact /> : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <SparePartRequestsPanel root="workOrder" id={order.id} />
      <Button asChild variant="outline" className="w-fit">
        <Link to={`/reports/work-orders/${order.id}`} data-testid="open-final-report"><FileText className="me-2 h-4 w-4" />{tReport("open")}</Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{tActivity("title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{tActivity("description")}</p>
        </CardHeader>
        <CardContent>
          <ActivityTimeline root="workOrder" id={order.id} />
        </CardContent>
      </Card>
      {assignTarget && (
        <AssignWorkerDialog
          key={assignTarget.taskId ?? "new"}
          orderId={order.id}
          task={assignTarget.taskId != null ? { id: assignTarget.taskId, assignedUserId: assignTarget.assignedUserId, assigneeName: assignTarget.name } : null}
          open
          onOpenChange={(o) => {
            if (!o) setAssignTarget(null);
          }}
        />
      )}
    </div>
      )}
    </div>
  );
}
