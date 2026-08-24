import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Activity } from "lucide-react";
import TableAuditLog from "./Component/TableAuditLog";
import useGetAuditLogs from "@/hooks/Audit/useGetAuditLogs";
import { AsyncBoundary } from "@/components/patterns/AsyncBoundary";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function AuditLog() {
  const { t } = useTranslation("auditLog");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const { data, isLoading, error } = useGetAuditLogs(page, limit);

  const logs = (data?.items ?? []).map((log) => ({
    action: log.action,
    resourceType: log.resourceType,
    resourceId: log.resourceId,
    ip: log.ip,
    createdAt: log.createdAt,
    userName: log.User?.fullName ?? null,
    userEmail: log.User?.email ?? null,
    organizationName: log.Organization?.name ?? null,
  }));

  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      log.action.toLowerCase().includes(q) ||
      log.resourceType.toLowerCase().includes(q) ||
      (log.resourceId && log.resourceId.toLowerCase().includes(q)) ||
      String(log.ip ?? "").toLowerCase().includes(q) ||
      String(log.userName ?? "").toLowerCase().includes(q) ||
      String(log.userEmail ?? "").toLowerCase().includes(q) ||
      String(log.organizationName ?? "").toLowerCase().includes(q);
    return matchesSearch;
  });

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="h-10 px-4 bg-muted/30 rounded-lg flex items-center gap-3 border shadow-inner">
          <Activity className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">{t("liveMonitoring")}</span>
        </div>
      </div>

      <AsyncBoundary isLoading={isLoading} error={error} loadingFallback={
        <div className="rounded-lg border bg-card p-8 text-sm text-muted-foreground">{t("loading")}</div>
      }>
        <TableAuditLog
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          logs={filteredLogs}
          total={data?.total ?? 0}
          page={data?.page ?? page}
          limit={data?.limit ?? limit}
          totalPages={data?.total != null && data.total > 0 ? Math.max(1, Math.ceil(data.total / (data?.limit ?? limit))) : 1}
          onPageChange={setPage}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
        />
      </AsyncBoundary>
    </div>
  );
}
