import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AsyncBoundary } from "@/components/patterns/AsyncBoundary";
import useGetWorkOrderById from "@/hooks/WorkOrders/useGetWorkOrderById";
import useGetInternalTasks from "@/hooks/WorkOrders/useGetInternalTasks";
import useReviewWorkOrder from "@/hooks/WorkOrders/useReviewWorkOrder";
import useCloseWorkOrder from "@/hooks/WorkOrders/useCloseWorkOrder";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/i18n/formatters";
import WorkOrderStatusBadge from "./components/WorkOrderStatusBadge";
import AssignTaskDialog from "./components/AssignTaskDialog";
import InternalTasksTable from "./components/InternalTasksTable";

export default function WorkOrderDetails() {
  const { t, i18n } = useTranslation("workOrders");
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [reviewNote, setReviewNote] = useState("");

  const reviewMutation = useReviewWorkOrder();
  const closeMutation = useCloseWorkOrder();

  const { data: workOrder, isLoading, error } = useGetWorkOrderById(id);
  const { data: tasksData, isLoading: tasksLoading } = useGetInternalTasks({
    workOrderId: id,
    page: 1,
    limit: 50,
  });

  const handleReview = (action: "APPROVE" | "REJECT") => {
    if (!id) return;
    if (action === "REJECT") {
      const trimmed = reviewNote.trim();
      if (trimmed.length > 0 && trimmed.length < 3) {
        toast.error(t("details.toasts.rejectNoteTooShort"));
        return;
      }
    }
    reviewMutation.mutate(
      { id, body: { action, note: reviewNote.trim() || undefined } },
      {
        onSuccess: () =>
          toast.success(action === "APPROVE" ? t("details.toasts.approved") : t("details.toasts.rejected")),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : t("details.toasts.reviewFailed")),
      }
    );
  };

  const handleClose = () => {
    if (!id) return;
    closeMutation.mutate(
      { id },
      {
        onSuccess: () => toast.success(t("details.toasts.closed")),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : t("details.toasts.closeFailed")),
      }
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <Button variant="outline" onClick={() => navigate("/work-orders/review-queue")}>
          {t("details.backToReviewQueue")}
        </Button>
        {id && hasPermission("internal_tasks.assign") ? (
          <AssignTaskDialog workOrderId={id} />
        ) : null}
      </div>

      <AsyncBoundary
        isLoading={isLoading}
        error={error ?? (!isLoading && !workOrder ? new Error(t("details.loadFailed")) : undefined)}
        loadingFallback={
          <Card>
            <CardContent className="p-6 text-muted-foreground">{t("details.loading")}</CardContent>
          </Card>
        }
      >
        {workOrder && (
          <>
            <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">#{workOrder.id}</span>
                    {workOrder.title}
                  </span>
                  <WorkOrderStatusBadge status={workOrder.status} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t("details.priority")}</p>
                    <p className="font-semibold">{workOrder.priority}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("details.branchId")}</p>
                    <p className="font-semibold">{workOrder.branchId ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("details.assetId")}</p>
                    <p className="font-semibold">{workOrder.assetId ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("details.requestedBy")}</p>
                    <p className="font-semibold">{workOrder.requestedByUserId ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("details.assignedUser")}</p>
                    <p className="font-semibold">{workOrder.assignedUserId ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("details.createdAt")}</p>
                    <p className="font-semibold">{formatDate(workOrder.createdAt, i18n.language, { dateStyle: "medium", timeStyle: "short" })}</p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">{t("details.description")}</p>
                  <p className="text-sm">{workOrder.description || t("details.noDescription")}</p>
                </div>
                {hasPermission("workorders.approve") ? (
                  <>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">{t("details.reviewNote")}</p>
                      <Textarea
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        placeholder={t("details.reviewNotePlaceholder")}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {workOrder.status === "UNDER_REVIEW" ? (
                        <>
                          <Button onClick={() => handleReview("APPROVE")} disabled={reviewMutation.isPending}>
                            {t("details.approve")}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleReview("REJECT")}
                            disabled={reviewMutation.isPending}
                          >
                            {t("details.reject")}
                          </Button>
                        </>
                      ) : null}
                      {workOrder.status !== "CLOSED" ? (
                        <Button variant="secondary" onClick={handleClose} disabled={closeMutation.isPending}>
                          {t("details.closeWorkOrder")}
                        </Button>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md">
              <CardHeader>
                <CardTitle>{t("details.internalTasks")}</CardTitle>
              </CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <div className="text-sm text-muted-foreground">{t("details.loadingInternalTasks")}</div>
                ) : (
                  <InternalTasksTable items={tasksData?.items ?? []} />
                )}
              </CardContent>
            </Card>
          </>
        )}
      </AsyncBoundary>
    </div>
  );
}
