import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AsyncBoundary, EmptyState, PageHeader } from "@/components/patterns";
import { ReportPriorityBadge, ReportStatusBadge } from "@/components/MaintenanceReportBadges";
import { useAuth } from "@/context/AuthContext";
import useMaintenanceReports from "@/hooks/MaintenanceReports/useMaintenanceReports";
import { formatDate, formatNumber } from "@/lib/i18n/formatters";
import { getBranchDisplayName } from "@/lib/company";
import { MAINTENANCE_REPORT_STATUSES } from "@/types/maintenanceReport";

const LIMIT = 20;

export default function MaintenanceReports() {
  const { t, i18n } = useTranslation("maintenanceReports");
  const { hasPermission } = useAuth();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useMaintenanceReports({ status: status || undefined, page, limit: LIMIT });
  const items = data?.items ?? [];
  const total = data?.pagination.total ?? 0;
  const canCreate = hasPermission("maintenance_issues.create");

  return (
    <div className="p-4 md:p-8 space-y-6">
      <PageHeader
        title={t("list.title")}
        description={t("list.subtitle")}
        action={
          canCreate ? (
            <Button asChild className="gap-2">
              <Link to="/maintenance-reports/create">
                <Plus className="h-4 w-4" />
                {t("list.newReport")}
              </Link>
            </Button>
          ) : undefined
        }
      />

      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">{t("list.statusLabel")}</label>
            <Select
              value={status || "all"}
              onValueChange={(v) => {
                setStatus(v === "all" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("list.allStatuses")}</SelectItem>
                {MAINTENANCE_REPORT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`status.${s}`)}
                    {data?.counters?.[s] != null ? ` (${formatNumber(data.counters[s] ?? 0, i18n.language)})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm text-muted-foreground">{t("list.totalCount", { count: total })}</span>
        </div>

        <AsyncBoundary
          isLoading={isLoading}
          error={error}
          loadingFallback={<p className="text-sm text-muted-foreground">{t("list.loading")}</p>}
          errorFallback={
            <div className="flex items-center gap-3 text-sm text-destructive" role="alert">
              <span>{t("list.loadFailed")}</span>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                {t("list.retry")}
              </Button>
            </div>
          }
        >
          {items.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-6 w-6" />}
              title={t("list.emptyTitle")}
              description={t("list.emptyDescription")}
              action={
                canCreate ? (
                  <Button asChild size="sm">
                    <Link to="/maintenance-reports/create">{t("list.newReport")}</Link>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="space-y-2">
              {items.map((r) => (
                <li key={r.id} className="flex flex-col gap-2 rounded-lg border p-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{r.title}</span>
                      <ReportStatusBadge status={r.status} />
                      <ReportPriorityBadge priority={r.priority} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {r.Branch ? getBranchDisplayName(r.Branch, i18n.language) : t("fields.noBranch")}
                      {r.Asset ? ` • ${r.Asset.name}` : ""}
                      {r.SubmittedByUser ? ` • ${r.SubmittedByUser.fullName}` : ""}
                      {` • ${formatDate(r.createdAt, i18n.language, { dateStyle: "medium", timeStyle: "short" })}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/maintenance-reports/${r.id}`}>{t("list.view")}</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </AsyncBoundary>

        {total > LIMIT && (
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              {t("list.previous")}
            </Button>
            <Button variant="outline" size="sm" disabled={page * LIMIT >= total} onClick={() => setPage((p) => p + 1)}>
              {t("list.next")}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
