import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Database, Globe, ChevronLeft, ChevronRight, User, Building2 } from "lucide-react";
import { formatDate } from "@/lib/i18n/formatters";

export type AuditLogRow = {
  action: string;
  resourceType: string;
  resourceId: string;
  ip: string | null;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
  organizationName: string | null;
};

type TableAuditLogProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  logs: AuditLogRow[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: number[];
};

function getActionBadge(action: string) {
  const lower = action.toLowerCase();
  const isCritical =
    lower.includes("approve") ||
    lower.includes("reject") ||
    lower.includes("submit");
  const isWarning = lower.includes("failed");
  return (
    <Badge
      variant={isCritical ? "default" : "outline"}
      className={`text-[10px] font-bold tracking-tight rounded-md py-0 ${
        isWarning ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900" : !isCritical ? "bg-muted/50" : ""
      }`}
    >
      {action.replace(/[_.]/g, " ")}
    </Badge>
  );
}

export default function TableAuditLog({
  searchQuery,
  onSearchChange,
  logs,
  total = 0,
  page = 1,
  limit = 20,
  totalPages = 1,
  onPageChange,
  onLimitChange,
  pageSizeOptions = [10, 20, 50, 100],
}: TableAuditLogProps) {
  const { t, i18n } = useTranslation("auditLog");
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md">
      <CardHeader className="pb-3 border-b bg-muted/30">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                className="ps-10 bg-background/50 border-muted-foreground/10"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {onLimitChange && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{t("perPage")}</span>
                  <Select value={String(limit)} onValueChange={(v) => onLimitChange(Number(v))}>
                    <SelectTrigger className="w-[72px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {pageSizeOptions.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <span className="text-xs text-muted-foreground">
                {t("totalSummary", { total, page, totalPages })}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[160px] font-bold text-foreground">{t("table.timestamp")}</TableHead>
                <TableHead className="font-bold text-foreground">{t("table.user")}</TableHead>
                <TableHead className="font-bold text-foreground">{t("table.organization")}</TableHead>
                <TableHead className="w-[180px] font-bold text-foreground">{t("table.action")}</TableHead>
                <TableHead className="font-bold text-foreground">{t("table.resource")}</TableHead>
                <TableHead className="font-bold text-foreground">{t("table.ip")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t("noResults")}
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log, index) => (
                  <TableRow
                    key={`${log.createdAt}-${log.action}-${log.resourceType}-${log.resourceId}-${index}`}
                    className="hover:bg-muted/10 border-b border-muted/5 last:border-0 transition-colors"
                  >
                    <TableCell className="text-[11px] font-bold text-muted-foreground">
                      <div className="flex flex-col">
                        <span>{formatDate(log.createdAt, i18n.language, { dateStyle: "medium" })}</span>
                        <span className="font-mono text-primary/70">
                          {formatDate(log.createdAt, i18n.language, {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          {log.userName ?? "—"}
                        </span>
                        {log.userEmail && (
                          <span className="text-[11px] text-muted-foreground">{log.userEmail}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        {log.organizationName ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter flex items-center gap-1">
                          <Database className="h-2.5 w-2.5" />
                          {log.resourceType}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-mono" dir="ltr">{log.ip ?? t("notAvailable")}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {onPageChange && totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 px-4 py-3 border-t bg-muted/20">
            <p className="text-xs text-muted-foreground">
              {t("showingPage", { page, totalPages, total })}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1"
                onClick={() => onPageChange(page - 1)}
                disabled={!hasPrev}
              >
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                {t("previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1"
                onClick={() => onPageChange(page + 1)}
                disabled={!hasNext}
              >
                {t("next")}
                <ChevronRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
