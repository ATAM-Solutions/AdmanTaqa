import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import useGetWorkOrderReviewQueue from "@/hooks/WorkOrders/useGetWorkOrderReviewQueue";
import useGetInternalTaskReviewQueue from "@/hooks/WorkOrders/useGetInternalTaskReviewQueue";
import WorkOrderStatusBadge from "./components/WorkOrderStatusBadge";
import InternalTaskStatusBadge from "./components/InternalTaskStatusBadge";

export default function WorkOrdersReviewQueue() {
  const { t } = useTranslation("workOrders");
  const {
    data: workOrdersQueue,
    isLoading: woLoading,
    isError: woError,
    error: woErrorObject,
  } = useGetWorkOrderReviewQueue();
  const {
    data: tasksQueue,
    isLoading: tasksLoading,
    isError: tasksError,
    error: tasksErrorObject,
  } = useGetInternalTaskReviewQueue();

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("reviewQueue.title")}</h1>
        <p className="text-muted-foreground">{t("reviewQueue.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle>{t("reviewQueue.workOrdersTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {woLoading ? (
              <p className="text-sm text-muted-foreground">{t("reviewQueue.loading")}</p>
            ) : woError ? (
              <p className="text-sm text-destructive">
                {woErrorObject instanceof Error
                  ? woErrorObject.message
                  : t("reviewQueue.workOrdersLoadFailed")}
              </p>
            ) : (workOrdersQueue?.items.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">{t("reviewQueue.noWorkOrders")}</p>
            ) : (
              workOrdersQueue?.items.map((order) => (
                <div
                  key={order.id}
                  className="rounded-lg border p-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-semibold text-sm">{order.title}</p>
                    <p className="text-xs text-muted-foreground">#{order.id}</p>
                  </div>
                  <WorkOrderStatusBadge status={order.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle>{t("reviewQueue.tasksTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasksLoading ? (
              <p className="text-sm text-muted-foreground">{t("reviewQueue.loading")}</p>
            ) : tasksError ? (
              <p className="text-sm text-destructive">
                {tasksErrorObject instanceof Error
                  ? tasksErrorObject.message
                  : t("reviewQueue.tasksLoadFailed")}
              </p>
            ) : (tasksQueue?.items.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">{t("reviewQueue.noTasks")}</p>
            ) : (
              tasksQueue?.items.map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg border p-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-semibold text-sm">{task.title ?? t("reviewQueue.internalTaskFallback")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("reviewQueue.taskMeta", { taskId: task.id, workOrderId: task.workOrderId })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <InternalTaskStatusBadge status={task.status} />
                    {task.workOrderId != null && (
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/work-orders/${task.workOrderId}`}>{t("reviewQueue.viewReview")}</Link>
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
