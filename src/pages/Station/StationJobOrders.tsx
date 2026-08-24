import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import useStationJobOrders from "@/hooks/Station/useStationJobOrders";
import type { StationJobOrderListItem } from "@/types/station";
import { formatDate } from "@/lib/i18n/formatters";

const STATUS_FILTER_VALUES = [
  "all",
  "AWAITING_PAYMENT",
  "ACTIVE",
  "IN_PROGRESS",
  "WAITING_PARTS",
  "UNDER_REVIEW",
  "REWORK_REQUIRED",
  "COMPLETED",
  "CLOSED",
  "CANCELLED",
];

export default function StationJobOrders() {
  const { t, i18n } = useTranslation("station");

  const jobOrderTitle = (jo: StationJobOrderListItem): string =>
    jo.ExternalRequest?.formData?.title ??
    jo.ServiceRequest?.formData?.title ??
    jo.ServiceRequest?.formData?.description ??
    t("jobOrders.jobOrderFallback", { id: jo.id });

  const jobOrderBranch = (jo: StationJobOrderListItem): string => {
    const branch = jo.ExternalRequest?.Branch;
    return branch?.nameEn ?? branch?.nameAr ?? (jo.ExternalRequest?.branchId != null ? t("jobOrders.branchFallback", { id: jo.ExternalRequest.branchId }) : "—");
  };

  const jobOrderProvider = (jo: StationJobOrderListItem): string => jo.ProviderQuote?.Organization?.name ?? "—";

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const limit = 20;
  const { data, isLoading } = useStationJobOrders({
    page,
    limit,
    status: statusFilter === "all" ? undefined : statusFilter,
  });
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("jobOrders.title")}</h1>
          <p className="text-muted-foreground">{t("jobOrders.subtitle")}</p>
        </div>
      </div>
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{t("jobOrders.status")}</span>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t("jobOrders.statusAllOption")} />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value === "all" ? t("jobOrders.statusAllOption") : value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm text-muted-foreground">{t("jobOrders.totalCount", { count: total })}</span>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("jobOrders.noOrders")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("jobOrders.table.id")}</TableHead>
                <TableHead>{t("jobOrders.table.title")}</TableHead>
                <TableHead>{t("jobOrders.table.status")}</TableHead>
                <TableHead>{t("jobOrders.table.branch")}</TableHead>
                <TableHead>{t("jobOrders.table.provider")}</TableHead>
                <TableHead>{t("jobOrders.table.created")}</TableHead>
                <TableHead className="text-end">{t("jobOrders.table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((jo) => (
                <TableRow key={jo.id}>
                  <TableCell className="font-mono" dir="ltr">{jo.id}</TableCell>
                  <TableCell className="font-medium">{jobOrderTitle(jo)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{jo.status ?? "—"}</Badge>
                  </TableCell>
                  <TableCell>{jobOrderBranch(jo)}</TableCell>
                  <TableCell>{jobOrderProvider(jo)}</TableCell>
                  <TableCell>
                    {jo.createdAt
                      ? formatDate(jo.createdAt, i18n.language, { dateStyle: "short", timeStyle: "short" })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-end">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/station-job-orders/${jo.id}`}>{t("jobOrders.view")}</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {total > limit && (
          <div className="flex gap-2 pt-4">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              {t("jobOrders.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * limit >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("jobOrders.next")}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
