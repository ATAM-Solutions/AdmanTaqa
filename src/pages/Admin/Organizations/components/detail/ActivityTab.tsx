import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Building2, FileText, GitBranch, History, User as UserIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/patterns";
import TablePagination from "@/components/TablePagination";
import { useGetAdminOrganizationActivity } from "@/hooks/AdminOrganizations/useAdminOrganizations";
import { formatDate } from "@/lib/i18n/formatters";
import { getApiErrorMessage } from "@/lib/utils";
import type { AdminActivityItem } from "@/types/adminOrganization";

const PAGE_SIZE = 20;
const MAX_DETAIL_CHIPS = 6;
/** Internal flags that carry no information for a human reader. */
const HIDDEN_DETAIL_KEYS = new Set(["createdByPlatformAdmin", "resetByPlatformAdmin", "before", "previous"]);

interface ActivityTabProps {
  organizationId: number;
}

export function ActivityTab({ organizationId }: ActivityTabProps) {
  const { t } = useTranslation("adminOrganizations");
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch, isFetching } = useGetAdminOrganizationActivity(
    organizationId,
    page,
    PAGE_SIZE
  );

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold">{t("detail.activity.title")}</CardTitle>
            <CardDescription>{t("detail.activity.description")}</CardDescription>
          </div>
          {total > 0 ? (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {t("detail.activity.count", { count: total })}
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-3 p-6">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : error ? (
          <div className="p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between gap-4">
                <span>{getApiErrorMessage(error, t("toasts.loadFailed"))}</span>
                <Button size="sm" variant="outline" onClick={() => refetch()}>
                  {t("actions.retry")}
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        ) : items.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<History className="h-6 w-6" />}
              title={t("detail.activity.emptyTitle")}
              description={t("detail.activity.emptyDescription")}
            />
          </div>
        ) : (
          <>
            <ol className={isFetching ? "opacity-70 transition-opacity" : "transition-opacity"}>
              {items.map((entry, index) => (
                <ActivityRow key={entry.id} entry={entry} isLast={index === items.length - 1} />
              ))}
            </ol>
            <TablePagination
              currentPage={page}
              totalPages={totalPages}
              total={total}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityRow({ entry, isLast }: { entry: AdminActivityItem; isLast: boolean }) {
  const { t, i18n } = useTranslation("adminOrganizations");
  const { chips, hiddenCount } = summarizeDetails(entry.details);
  const actor = entry.User?.fullName ?? t("detail.activity.system");
  const branchName = entry.Branch
    ? i18n.language.startsWith("ar")
      ? entry.Branch.nameAr || entry.Branch.nameEn
      : entry.Branch.nameEn || entry.Branch.nameAr
    : null;

  return (
    <li className="relative flex gap-4 px-6 py-4">
      {!isLast ? <span className="absolute start-[2.3rem] top-12 bottom-0 w-px bg-border" aria-hidden /> : null}
      <div className="relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground">
        {iconForResource(entry.resourceType)}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <p className="font-medium text-sm">
            {t(`detail.activity.actions.${entry.action}`, { defaultValue: entry.action })}
          </p>
          <time className="text-xs text-muted-foreground whitespace-nowrap" dateTime={entry.createdAt}>
            {formatDate(entry.createdAt, i18n.language, { dateStyle: "medium", timeStyle: "short" })}
          </time>
        </div>
        <p className="text-xs text-muted-foreground">
          {actor}
          {branchName ? (
            <>
              {" · "}
              <span dir="auto">{branchName}</span>
            </>
          ) : null}
        </p>
        {chips.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {chips.map((chip) => (
              <Badge key={chip.key} variant="outline" className="font-normal text-[11px] gap-1 max-w-full">
                <span className="text-muted-foreground">{chip.key}:</span>
                <span className="truncate" dir="auto">
                  {chip.value}
                </span>
              </Badge>
            ))}
            {hiddenCount > 0 ? (
              <Badge variant="secondary" className="font-normal text-[11px]">
                {t("detail.activity.more", { count: hiddenCount })}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}

function iconForResource(resourceType: string | null): ReactNode {
  switch (resourceType) {
    case "Organization":
      return <Building2 className="h-4 w-4" />;
    case "Branch":
      return <GitBranch className="h-4 w-4" />;
    case "User":
      return <UserIcon className="h-4 w-4" />;
    case "OrganizationDocument":
    case "ServiceProviderDocument":
      return <FileText className="h-4 w-4" />;
    default:
      return <History className="h-4 w-4" />;
  }
}

type DetailChip = { key: string; value: string };

function isPrimitive(value: unknown): value is string | number | boolean {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Compact, human-readable summary of an audit `details` blob: one level of
 * "key: value" chips (nested one extra level for e.g. `changed`), capped so a
 * large payload never turns the timeline into a JSON dump.
 */
function summarizeDetails(details: Record<string, unknown> | null): { chips: DetailChip[]; hiddenCount: number } {
  const chips: DetailChip[] = [];
  const source = details && isPlainObject(details.changed) ? details.changed : details;
  if (source) {
    for (const [key, value] of Object.entries(source)) {
      if (HIDDEN_DETAIL_KEYS.has(key) || value === null || value === undefined) continue;
      if (isPrimitive(value)) {
        chips.push({ key, value: String(value) });
      } else if (Array.isArray(value)) {
        if (value.every(isPrimitive)) chips.push({ key, value: value.map(String).join(", ") });
      } else if (isPlainObject(value)) {
        for (const [subKey, subValue] of Object.entries(value)) {
          if (isPrimitive(subValue)) chips.push({ key: `${key}.${subKey}`, value: String(subValue) });
        }
      }
    }
  }
  return { chips: chips.slice(0, MAX_DETAIL_CHIPS), hiddenCount: Math.max(0, chips.length - MAX_DETAIL_CHIPS) };
}
