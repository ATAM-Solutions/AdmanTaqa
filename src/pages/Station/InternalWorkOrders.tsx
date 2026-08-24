import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useInternalWorkOrders from "@/hooks/Station/useInternalWorkOrders";
import type { InternalWorkOrderStatus } from "@/types/internalWorkOrder";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

export default function InternalWorkOrders() {
  const { t } = useTranslation("station");
  const [status, setStatus] = useState<InternalWorkOrderStatus | "all">("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useInternalWorkOrders({ status, page, limit });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("internalWorkOrders.title")}</h1>
          <p className="text-muted-foreground">{t("internalWorkOrders.subtitle")}</p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/station-requests/create">
            <Plus className="h-4 w-4" />
            {t("internalWorkOrders.newRequest")}
          </Link>
        </Button>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap gap-3">
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as InternalWorkOrderStatus | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("jobOrders.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("internalWorkOrders.statusAll")}</SelectItem>
              <SelectItem value="PENDING">{t("internalWorkOrders.statusPending")}</SelectItem>
              <SelectItem value="IN_PROGRESS">{t("internalWorkOrders.statusInProgress")}</SelectItem>
              <SelectItem value="UNDER_REVIEW">{t("internalWorkOrders.statusUnderReview")}</SelectItem>
              <SelectItem value="CLOSED">{t("internalWorkOrders.statusClosed")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("internalWorkOrders.noOrders")}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((wo) => (
              <li key={wo.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <span className="font-medium">{wo.title}</span>
                  <span className="ms-2 text-xs text-muted-foreground">#{wo.id}</span>
                  <span className="ms-2 text-xs uppercase">{wo.status}</span>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/internal-work-orders/${wo.id}`}>{t("internalWorkOrders.view")}</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
        {total > limit && (
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              {t("internalWorkOrders.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * limit >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("internalWorkOrders.next")}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
