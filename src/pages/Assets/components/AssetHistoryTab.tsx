import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/patterns";
import { useAssetHistory } from "@/hooks/Assets/useAssetManagement";
import { classifyAssetError, isTerminalAssetError } from "@/lib/assets";
import { flattenHistory } from "@/lib/assetHistory";
import { AssetHistoryTimeline } from "./AssetHistoryTimeline";
import { RecordsCard } from "./AssetRecordParts";
import { assetErrorMessage } from "./assetErrors";

/**
 * Asset activity timeline. Read-only; shows only what the (already sanitised) history API returned. The query is keyed by
 * company and asset, so switching either starts again from the first page; "Load more" follows `page.nextCursor`.
 */
export default function AssetHistoryTab({ assetId }: { assetId: number | string }) {
  const { t, i18n } = useTranslation("assets");
  const query = useAssetHistory(assetId);
  const events = useMemo(() => flattenHistory(query.data?.pages), [query.data]);
  const hasData = query.data !== undefined;

  let body;
  if (query.isLoading) {
    body = (
      <div className="space-y-2" aria-busy="true" data-testid="history-loading">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  } else if (!hasData || (query.isError && events.length === 0)) {
    // the first page failed: nothing to keep on screen
    const terminal = isTerminalAssetError(classifyAssetError(query.error).kind);
    body = (
      <Alert variant="destructive" data-testid="records-error">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>{t("errors.loadFailed")} {assetErrorMessage(t, query.error)}</span>
          {terminal ? null : <Button size="sm" variant="outline" onClick={() => query.refetch()}>{t("list.retry")}</Button>}
        </AlertDescription>
      </Alert>
    );
  } else if (events.length === 0) {
    body = <EmptyState title={t("history.empty")} description={t("history.emptyHint")} />;
  } else {
    body = (
      <AssetHistoryTimeline
        events={events}
        locale={i18n.language}
        hasMore={query.hasNextPage}
        loadingMore={query.isFetchingNextPage}
        loadMoreFailed={query.isError && !query.isFetchingNextPage}
        // never start a second page request while one is pending
        onLoadMore={() => { if (!query.isFetchingNextPage) void query.fetchNextPage({ cancelRefetch: false }); }}
      />
    );
  }

  return (
    <RecordsCard title={t("history.title")} description={t("history.description")}>
      {body}
    </RecordsCard>
  );
}
