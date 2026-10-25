import { useTranslation } from "react-i18next";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, CheckCircle, XCircle, Lock, UserPlus, UserCog } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import AssignWorkerDialog from "./AssignWorkerDialog";
import TaskProgress from "@/components/TaskProgress";
import SourceReportAttachments from "@/components/SourceReportAttachments";
import { toast } from "sonner";
import useInternalWorkOrderById from "@/hooks/Station/useInternalWorkOrderById";
import useReviewInternalWorkOrder from "@/hooks/Station/useReviewInternalWorkOrder";
import useCloseInternalWorkOrder from "@/hooks/Station/useCloseInternalWorkOrder";

export default function InternalWorkOrderDetail() {
  const { t } = useTranslation("station");
  const { t: tTasks } = useTranslation("tasks");
  const { t: tCommon } = useTranslation("common");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading, error } = useInternalWorkOrderById(id ?? null);
  const forbidden = (error as { response?: { status?: number } } | null)?.response?.status === 403;
  const reviewMutation = useReviewInternalWorkOrder();
  const closeMutation = useCloseInternalWorkOrder();
  const { hasPermission } = useAuth();
  const [assignTarget, setAssignTarget] = useState<{ taskId: number | null; assignedUserId?: number | null; name?: string | null } | null>(null);

  const handleReview = (decision: "APPROVE" | "REJECT") => {
    if (!id) return;
    reviewMutation.mutate(
      { id, body: { decision } },
      {
        onSuccess: () => toast.success(decision === "APPROVE" ? t("internalWorkOrders.detail.toasts.approved") : t("internalWorkOrders.detail.toasts.rejected")),
        onError: (e) => toast.error(e instanceof Error ? e.message : t("internalWorkOrders.detail.toasts.reviewFailed")),
      }
    );
  };

  const handleClose = () => {
    if (!id) return;
    closeMutation.mutate(id, {
      onSuccess: () => toast.success(t("internalWorkOrders.detail.toasts.closed")),
      onError: (e) => toast.error(e instanceof Error ? e.message : t("internalWorkOrders.detail.toasts.closeFailed")),
    });
  };

  const canReview = order?.status === "UNDER_REVIEW";
  // Closing an order IS the operations confirmation: only for holders of ops_confirm, only once the order is
  // awaiting it. It is never a substitute for a technician completing their task (Report 3 finding 2).
  const canClose = order?.status === "AWAITING_OPS_CONFIRMATION" && hasPermission("internal_work_orders.ops_confirm");
  const orderOpenForWork = order != null && order.status !== "CLOSED" && order.status !== "CANCELLED";
  const canAssign = orderOpenForWork && hasPermission("internal_tasks.assign");

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
              {t("internalWorkOrders.detail.idLabel", { id: order.id })} <Badge variant="secondary">{order.status}</Badge>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canReview && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleReview("APPROVE")}
                  disabled={reviewMutation.isPending}
                  className="gap-1"
                >
                  <CheckCircle className="h-4 w-4" /> {t("internalWorkOrders.detail.approve")}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleReview("REJECT")}
                  disabled={reviewMutation.isPending}
                  className="gap-1"
                >
                  <XCircle className="h-4 w-4" /> {t("internalWorkOrders.detail.reject")}
                </Button>
              </>
            )}
            {canAssign && (
              <Button size="sm" onClick={() => setAssignTarget({ taskId: null })} className="gap-1">
                <UserPlus className="h-4 w-4" /> {t("assignWorker.open")}
              </Button>
            )}
            {canClose && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleClose}
                disabled={closeMutation.isPending}
                className="gap-1"
              >
                <Lock className="h-4 w-4" /> {t("internalWorkOrders.detail.close")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {order.description && <p className="text-sm">{order.description}</p>}
        </CardContent>
      </Card>
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
                <li key={task.id} className="flex flex-wrap items-center justify-between gap-3 py-3" data-testid="order-task">
                  <div className="min-w-0">
                    <p className="text-sm font-medium" dir="auto">
                      {task.assignedUser?.fullName ?? t("assignWorker.unassigned")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      #{task.id} · <Badge variant="outline">{task.status ?? "—"}</Badge>
                    </p>
                    {task.progress ? (
                      <div className="mt-2 max-w-xl">
                        <TaskProgress progress={task.progress} compact />
                      </div>
                    ) : null}
                  </div>
                  {hasPermission("internal_tasks.read") && (
                    <Button asChild size="sm" variant="outline" className="gap-1">
                      <Link to={`/internal-tasks/${task.id}`} data-testid="open-task">{tTasks("open")}</Link>
                    </Button>
                  )}
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
                </li>
              ))}
            </ul>
          )}
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
