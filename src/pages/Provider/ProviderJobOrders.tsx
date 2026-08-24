import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useJobOrdersWebList } from "@/hooks/Provider/useJobOrdersWeb";
import { Eye } from "lucide-react";
import type { ProviderJobOrderItem } from "@/types/provider";

/** Status filter options per job-orders-web API (CREATED, AWAITING_PAYMENT, ACTIVE, ...). */
const STATUS_VALUES = [
  "all",
  "CREATED",
  "AWAITING_PAYMENT",
  "ACTIVE",
  "IN_PROGRESS",
  "WAITING_PARTS",
  "UNDER_REVIEW",
  "REWORK_REQUIRED",
  "COMPLETED",
  "CANCELLED",
  "CLOSED",
  "SUSPENDED",
] as const;

export default function ProviderJobOrders() {
  const { t } = useTranslation("provider");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const limit = 20;
  const { data, isLoading } = useJobOrdersWebList({
    page,
    limit,
    ...(statusFilter && { status: statusFilter }),
  });
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = total > 0 && limit > 0 ? Math.ceil(total / limit) : 1;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("jobOrders.title")}</h1>
        <p className="text-muted-foreground">{t("jobOrders.subtitle")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">{t("jobOrders.statusFilter")}</span>
        <Select
          value={statusFilter || "all"}
          onValueChange={(v) => {
            setStatusFilter(v === "all" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder={t("jobOrders.statusOptions.all")} />
          </SelectTrigger>
          <SelectContent>
            {STATUS_VALUES.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`jobOrders.statusOptions.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Card>
        {isLoading ? (
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">{t("jobOrders.loading")}</p>
          </CardContent>
        ) : items.length === 0 ? (
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t("jobOrders.empty")}</p>
              <p className="text-xs text-muted-foreground">
                <Trans i18nKey="jobOrders.emptyHint" ns="provider" components={{ strong: <strong /> }} />
              </p>
              {statusFilter === "AWAITING_PAYMENT" && (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {t("jobOrders.emptyAwaitingPayment")}
                </p>
              )}
            </div>
          </CardContent>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-bold">{t("jobOrders.table.status")}</TableHead>
                    <TableHead className="font-bold">{t("jobOrders.table.title")}</TableHead>
                    <TableHead className="font-bold">{t("jobOrders.table.priority")}</TableHead>
                    <TableHead className="font-bold max-w-[280px]">{t("jobOrders.table.description")}</TableHead>
                    <TableHead className="text-end font-bold">{t("jobOrders.table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((jo: ProviderJobOrderItem) => {
                    const formData = jo.externalRequest?.formData ?? {};
                    const title = formData.title?.trim() || "—";
                    const priority = formData.priority?.trim() || "—";
                    const description = formData.description?.trim() || "—";
                    return (
                      <TableRow key={jo.id} className="hover:bg-muted/20">
                        <TableCell>
                          <Badge variant={jo.status === "COMPLETED" ? "default" : "secondary"} className="text-xs">
                            {jo.status ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>{title}</TableCell>
                        <TableCell>
                          {priority === "—" ? "—" : <Badge variant="outline" className="text-xs">{priority}</Badge>}
                        </TableCell>
                        <TableCell className="max-w-[280px] truncate text-muted-foreground" title={description === "—" ? undefined : description}>
                          {description}
                        </TableCell>
                        <TableCell className="text-end">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/provider-job-orders/${jo.id}`} className="gap-1.5">
                              <Eye className="h-4 w-4" /> {t("jobOrders.view")}
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {items.length > 0 && !statusFilter && (
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground border-t pt-3">
                  <Trans i18nKey="jobOrders.awaitingPaymentHint" ns="provider" components={{ strong: <strong /> }} />
                </p>
              </CardContent>
            )}
            {totalPages > 1 && (
              <CardContent className="pt-0 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {t("jobOrders.previous")}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t("jobOrders.pageOf", { page, totalPages })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  {t("jobOrders.next")}
                </Button>
              </CardContent>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
