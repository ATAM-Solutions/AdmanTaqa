import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchWarehouseRequests } from "@/api/services/technicianService";

const PAGE_SIZE = 20;

export default function WarehouseRequests() {
  const { t } = useTranslation("station");
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["warehouse-requests", page],
    queryFn: () => fetchWarehouseRequests(page, PAGE_SIZE),
    retry: false,
  });
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">{t("warehouseRequests.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("warehouseRequests.subtitle")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("warehouseRequests.listTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
            </p>
          ) : isError ? (
            <div className="space-y-2" role="alert">
              <p className="text-sm text-destructive">{t("warehouseRequests.loadFailed")}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                {t("myTasks.retry")}
              </Button>
            </div>
          ) : !data || data.items.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="warehouse-empty">
              {t("warehouseRequests.empty")}
            </p>
          ) : (
            <ul className="divide-y" data-testid="warehouse-list">
              {data.items.map((row) => (
                <li key={row.id} className="space-y-1 py-3">
                  <p className="text-sm font-medium" dir="auto">
                    <Link className="underline" to={`/warehouse-requests/${row.id}`} data-testid="open-request">
                      {t("warehouseRequests.request", { id: row.id })}
                    </Link>
                    {row.workOrderTitle ? ` — ${row.workOrderTitle}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <Badge variant="outline">{row.status}</Badge>
                    {" · "}
                    {t("warehouseRequests.items", { count: row.itemCount })}
                    {row.stationName ? <> · <span dir="auto">{row.stationName}</span></> : null}
                    {row.warehouseName ? <> · <span dir="auto">{row.warehouseName}</span></> : null}
                  </p>
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
        </CardContent>
      </Card>
    </div>
  );
}
