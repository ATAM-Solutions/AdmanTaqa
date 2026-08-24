import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { reportError } from "@/lib/errorReporting";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import useAuthorityExternalJobOrders from "@/hooks/AuthorityExternalJobOrders/useAuthorityExternalJobOrders";
import { fetchAuthorityExternalJobOrderExport } from "@/api/services/authorityExternalJobOrderService";
import { formatDate } from "@/lib/i18n/formatters";
import type {
  AuthorityExternalJobOrderItem,
  AuthorityExternalJobOrdersListParams,
  DatePreset,
} from "@/types/authorityExternalJobOrder";

const DATE_PRESET_VALUES: DatePreset[] = ["today", "week", "month", "custom"];
const STATUS_VALUES = ["ACTIVE", "IN_PROGRESS", "AWAITING_PAYMENT", "COMPLETED", "CLOSED", "CREATED", "CANCELLED"];

const LIMIT = 20;

function getStatusBadgeVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  if (["COMPLETED", "DONE", "CLOSED"].includes(status)) return "secondary";
  if (["ACTIVE", "IN_PROGRESS"].includes(status)) return "default";
  if (["REJECTED", "CANCELLED"].includes(status)) return "destructive";
  return "outline";
}

export default function AuthorityExternalJobOrders() {
  const { t, i18n } = useTranslation("authority");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset | "">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [fuelStationOrganizationName, setFuelStationOrganizationName] = useState("");
  const [serviceProviderOrganizationName, setServiceProviderOrganizationName] = useState("");
  const [exportLoading, setExportLoading] = useState<"csv" | null>(null);

  const listParams: AuthorityExternalJobOrdersListParams = {
    page,
    limit: LIMIT,
    ...(status.trim() ? { status: status.trim() } : {}),
    ...(datePreset ? { datePreset: datePreset as DatePreset } : {}),
    ...(datePreset === "custom" && fromDate ? { fromDate } : {}),
    ...(datePreset === "custom" && toDate ? { toDate } : {}),
    ...(fuelStationOrganizationName.trim() ? { fuelStationOrganizationName: fuelStationOrganizationName.trim() } : {}),
    ...(serviceProviderOrganizationName.trim() ? { serviceProviderOrganizationName: serviceProviderOrganizationName.trim() } : {}),
  };

  const { data, isLoading, isError, error } = useAuthorityExternalJobOrders(listParams);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const maxPage = Math.max(1, Math.ceil(total / LIMIT));

  const handleExport = useCallback(async (format: "csv") => {
    setExportLoading(format);
    try {
      await fetchAuthorityExternalJobOrderExport({
        status: status.trim() || undefined,
        datePreset: datePreset || undefined,
        fromDate: datePreset === "custom" ? fromDate || undefined : undefined,
        toDate: datePreset === "custom" ? toDate || undefined : undefined,
        fuelStationOrganizationName: fuelStationOrganizationName.trim() || undefined,
        serviceProviderOrganizationName: serviceProviderOrganizationName.trim() || undefined,
        format,
      });
    } catch (err) {
      reportError("Export failed:", err);
    } finally {
      setExportLoading(null);
    }
  }, [
    status,
    datePreset,
    fromDate,
    toDate,
    fuelStationOrganizationName,
    serviceProviderOrganizationName,
  ]);

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("externalJobOrders.list.title")}</h1>
          <p className="text-muted-foreground">{t("externalJobOrders.list.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={exportLoading !== null}
            onClick={() => handleExport("csv")}
          >
            {exportLoading === "csv" ? t("externalJobOrders.list.exporting") : t("externalJobOrders.list.export")}
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">{t("externalJobOrders.list.statusLabel")}</label>
            <Select
              value={status || "all"}
              onValueChange={(v) => {
                setStatus(v === "all" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={t("externalJobOrders.list.statusAll")} />
              </SelectTrigger>
              <SelectContent>
                {STATUS_VALUES.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {t(`externalJobOrders.list.statuses.${opt}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">{t("externalJobOrders.list.datePresetLabel")}</label>
            <Select
              value={datePreset || "all"}
              onValueChange={(v) => {
                setDatePreset(v === "all" ? "" : (v as DatePreset));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={t("externalJobOrders.list.statusAll")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("externalJobOrders.list.statusAll")}</SelectItem>
                {DATE_PRESET_VALUES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {t(`externalJobOrders.list.datePresets.${p}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {datePreset === "custom" && (
            <>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">{t("externalJobOrders.list.fromDate")}</label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPage(1);
                  }}
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">{t("externalJobOrders.list.toDate")}</label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPage(1);
                  }}
                  className="h-9"
                />
              </div>
            </>
          )}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">{t("externalJobOrders.list.fuelStationSearch")}</label>
            <Input
              placeholder={t("externalJobOrders.list.fuelStationSearchPlaceholder")}
              value={fuelStationOrganizationName}
              onChange={(e) => {
                setFuelStationOrganizationName(e.target.value);
                setPage(1);
              }}
              className="h-9"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">{t("externalJobOrders.list.serviceProviderSearch")}</label>
            <Input
              placeholder={t("externalJobOrders.list.serviceProviderSearchPlaceholder")}
              value={serviceProviderOrganizationName}
              onChange={(e) => {
                setServiceProviderOrganizationName(e.target.value);
                setPage(1);
              }}
              className="h-9"
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {t("externalJobOrders.list.totalPage", { total, page: data?.page ?? page })}
        </p>

        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">{t("externalJobOrders.list.loading")}</div>
        ) : isError ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-destructive text-sm">
            {error instanceof Error ? error.message : t("externalJobOrders.list.loadFailed")}
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">{t("externalJobOrders.list.empty")}</div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold text-foreground">{t("externalJobOrders.list.columns.status")}</TableHead>
                <TableHead className="font-bold text-foreground">{t("externalJobOrders.list.columns.created")}</TableHead>
                <TableHead className="font-bold text-foreground">{t("externalJobOrders.list.columns.title")}</TableHead>
                <TableHead className="font-bold text-foreground">{t("externalJobOrders.list.columns.branch")}</TableHead>
                <TableHead className="text-end font-bold text-foreground">{t("externalJobOrders.list.columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row: AuthorityExternalJobOrderItem) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(row.status ?? "")}>
                      {row.status ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {row.createdAt ? formatDate(row.createdAt, i18n.language, { dateStyle: "short", timeStyle: "short" }) : "—"}
                  </TableCell>
                  <TableCell>
                    {row.ExternalRequest?.formData?.title ?? "—"}
                  </TableCell>
                  <TableCell>
                    {row.ExternalRequest?.Branch?.nameEn ?? row.ExternalRequest?.Branch?.nameAr ?? "—"}
                  </TableCell>
                  <TableCell className="text-end">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/external-job-orders/${row.id}`}>
                        <Eye className="h-4 w-4 me-1" />
                        {t("externalJobOrders.list.view")}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            {t("externalJobOrders.list.previous")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("externalJobOrders.list.pageOf", { page, maxPage })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => (p < maxPage ? p + 1 : p))}
            disabled={page >= maxPage}
          >
            {t("externalJobOrders.list.next")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
