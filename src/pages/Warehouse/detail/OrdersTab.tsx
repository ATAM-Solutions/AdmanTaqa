import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchWarehouseOrdersFor } from "@/api/services/warehouseAdminService";
import { Loading, LoadError } from "./shared";
import { fmtDate } from "@/lib/warehouseDisplay";

export default function OrdersTab({ warehouseId }: { warehouseId: number }) {
  const { t, i18n } = useTranslation("warehouse");
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ["warehouse-orders-for", warehouseId, page], queryFn: () => fetchWarehouseOrdersFor(warehouseId, page), retry: false });

  return (
    <div className="space-y-3" data-testid="wd-orders">
      {q.isLoading ? <Loading /> : q.isError ? <LoadError error={q.error} onRetry={() => q.refetch()} /> : (q.data?.items ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="wd-orders-empty">{t("mgmt.orders.empty")}</p>
      ) : (
        <>
          <ul className="divide-y">
            {q.data?.items.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3" data-testid="wd-order-row">
                <div>
                  <Link to={`/warehouse-requests/${o.id}`} className="font-medium hover:underline">{t("request", { id: o.id })}</Link>
                  <p className="text-xs text-muted-foreground" dir="auto">{[o.stationName, o.requestedBy, fmtDate(o.createdAt, i18n.language)].filter(Boolean).join(" · ")}</p>
                </div>
                <Badge variant="outline">{t(`status.${o.status}`, { defaultValue: o.status })}</Badge>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2 text-sm">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t("mgmt.prev")}</Button>
            <span>{page} / {q.data?.totalPages ?? 1}</span>
            <Button size="sm" variant="outline" disabled={page >= (q.data?.totalPages ?? 1)} onClick={() => setPage((p) => p + 1)}>{t("mgmt.next")}</Button>
          </div>
        </>
      )}
    </div>
  );
}
