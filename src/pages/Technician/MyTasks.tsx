import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchMyTasks } from "@/api/services/technicianService";
import { useAuth } from "@/context/AuthContext";

const PAGE_SIZE = 20;

export default function MyTasks() {
  const { t } = useTranslation("station");
  const { hasPermission } = useAuth();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["my-tasks", page],
    queryFn: () => fetchMyTasks(page, PAGE_SIZE),
    retry: false,
  });
  const canOpenOrder = hasPermission("internal_work_orders.read");
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">{t("myTasks.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("myTasks.subtitle")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("myTasks.listTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
            </p>
          ) : isError ? (
            <div className="space-y-2" role="alert">
              <p className="text-sm text-destructive">{t("myTasks.loadFailed")}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                {t("myTasks.retry")}
              </Button>
            </div>
          ) : !data || data.items.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="my-tasks-empty">
              {t("myTasks.empty")}
            </p>
          ) : (
            <ul className="divide-y" data-testid="my-tasks-list">
              {data.items.map((task) => (
                <li key={task.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium" dir="auto">
                      {task.orderTitle ?? t("myTasks.untitled", { id: task.id })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      #{task.id} · <Badge variant="outline">{task.status}</Badge>
                      {task.assignedBy ? <> · {t("myTasks.assignedBy", { name: task.assignedBy })}</> : null}
                    </p>
                    {task.notes ? (
                      <p className="text-xs text-muted-foreground" dir="auto">
                        {task.notes}
                      </p>
                    ) : null}
                  </div>
                  {canOpenOrder && task.orderId != null ? (
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/internal-work-orders/${task.orderId}`}>{t("myTasks.openOrder")}</Link>
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {data && pages > 1 ? (
            <div className="mt-4 flex items-center justify-between">
              <Button variant="outline" size="sm" disabled={page <= 1 || isFetching} onClick={() => setPage((p) => p - 1)}>
                {t("myTasks.prev")}
              </Button>
              <span className="text-xs text-muted-foreground">
                {page} / {pages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= pages || isFetching} onClick={() => setPage((p) => p + 1)}>
                {t("myTasks.next")}
              </Button>
            </div>
          ) : null}
          <p className="mt-4 text-xs text-muted-foreground">{t("myTasks.mobileNote")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
