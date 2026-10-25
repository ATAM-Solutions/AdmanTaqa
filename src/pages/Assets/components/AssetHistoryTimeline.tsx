import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { AlertCircle, ClipboardCheck, FileText, HelpCircle, History, Link2, Loader2, Pencil, PlusCircle, ShieldCheck, Trash2, Upload, Wrench } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateOnly, formatDateTime } from "@/lib/assets";
import {
  DATE_FIELDS, ENUM_FIELDS, detailNumber, detailText, eventKey, eventKind, isKnownField, isolate, isolateLtr, readChanges, safeText,
  type EventKind, type FieldChange,
} from "@/lib/assetHistory";
import { formatFileSize } from "@/lib/documentUploads";
import type { AssetHistoryEvent } from "@/types/asset";

const ICONS: Record<EventKind, ReactNode> = {
  "asset.created": <PlusCircle className="h-4 w-4" />,
  "asset.updated": <Pencil className="h-4 w-4" />,
  "asset_warranty.created": <ShieldCheck className="h-4 w-4" />,
  "asset_warranty.updated": <ShieldCheck className="h-4 w-4" />,
  "asset_inspection.recorded": <ClipboardCheck className="h-4 w-4" />,
  "asset_maintenance.recorded": <Wrench className="h-4 w-4" />,
  "asset_document.link_added": <Link2 className="h-4 w-4" />,
  "asset_document.uploaded": <Upload className="h-4 w-4" />,
  "asset_document.deleted": <Trash2 className="h-4 w-4" />,
  legacy: <History className="h-4 w-4" />,
  unknown: <HelpCircle className="h-4 w-4" />,
};

/** One value of a change, as plain translated text. Redacted values never reach this function. */
function valueText(t: TFunction, locale: string, field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return t("history.emptyValue");
  const text = safeText(value);
  if (text === null) return t("history.emptyValue");
  const enumKind = ENUM_FIELDS[field];
  if (enumKind) {
    const key = `${enumKind}.${text}`;
    return t(key, { defaultValue: text });
  }
  if (DATE_FIELDS.has(field)) return formatDateOnly(text, locale);
  return text;
}

const fieldLabel = (t: TFunction, field: string) => {
  if (!isKnownField(field)) return safeText(field, 40) ?? "—";
  return t(`history.fields.${field}`, { defaultValue: t(`form.fields.${field}`, { defaultValue: field }) });
};

function Changes({ changes, locale }: { changes: FieldChange[]; locale: string }) {
  const { t } = useTranslation("assets");
  if (changes.length === 0) return null;
  return (
    <div className="space-y-1.5" data-testid="history-changes">
      <p className="text-xs font-medium text-muted-foreground">{t("history.details.changes")}</p>
      <ul className="space-y-1.5">
        {changes.map((c, i) => (
          <li key={`${c.field}-${i}`} className="rounded-md border bg-muted/30 px-3 py-2 text-sm" data-testid={`history-change-${c.field}`}>
            <span className="font-medium" dir="auto">{fieldLabel(t, c.field)}</span>
            {c.redacted ? (
              <span className="ms-2 text-muted-foreground" data-testid={`history-redacted-${c.field}`}>{t("history.details.redacted")}</span>
            ) : c.valueless ? (
              <span className="ms-2 text-muted-foreground" data-testid={`history-valueless-${c.field}`}>{t("history.details.providerChanged")}</span>
            ) : (
              <span className="mt-1 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-3">
                <span className="min-w-0 break-words"><span className="text-xs text-muted-foreground">{t("history.details.before")}: </span><span dir="auto">{valueText(t, locale, c.field, c.from)}</span></span>
                <span className="min-w-0 break-words"><span className="text-xs text-muted-foreground">{t("history.details.after")}: </span><span dir="auto">{valueText(t, locale, c.field, c.to)}</span></span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

const Line = ({ children, testId }: { children: ReactNode; testId?: string }) => <p className="text-sm text-muted-foreground" data-testid={testId}>{children}</p>;

/** Title + description + extra safe details for one event. Unknown codes and legacy rows are generic and never throw. */
function EventBody({ event, locale }: { event: AssetHistoryEvent; locale: string }) {
  const { t } = useTranslation("assets");
  const kind = eventKind(event);
  const d = event.details && typeof event.details === "object" ? event.details : null;
  const name = (keys: string[]) => isolate(keys.map((k) => detailText(d, k)).find(Boolean) ?? t("history.unnamed"));
  const dateOnly = (key: string) => formatDateOnly(detailText(d, key, 40), locale);
  const notes = (
    <Line testId="history-notes">{d?.hasNotes === true ? t("history.details.notesProvided") : t("history.details.noNotes")}</Line>
  );

  if (kind === "legacy" || kind === "unknown") {
    return (
      <>
        <p className="font-medium">{t(kind === "legacy" ? "history.generic.legacyTitle" : "history.generic.unknownTitle")}</p>
        <Line>{t(kind === "legacy" ? "history.generic.legacyDescription" : "history.generic.unknownDescription")}</Line>
        <Line testId="history-code"><span className="font-mono">{t("history.generic.code", { code: isolateLtr(safeText(event.eventType, 60) ?? "—") })}</span></Line>
      </>
    );
  }

  const k = eventKey(kind);
  const title = <p className="font-medium">{t(`history.events.${k}.title`)}</p>;
  switch (kind) {
    case "asset.created":
      return <>{title}<Line>{t(`history.events.${k}.description`, { name: name(["name"]) })}</Line></>;
    case "asset.updated":
      return <>{title}<Line>{t(`history.events.${k}.description`)}</Line><Changes changes={readChanges(d)} locale={locale} /></>;
    case "asset_warranty.created":
      return <>{title}<Line>{t(`history.events.${k}.description`, { start: dateOnly("startDate"), end: dateOnly("endDate") })}</Line></>;
    case "asset_warranty.updated":
      return <>{title}<Line>{t(`history.events.${k}.description`)}</Line><Changes changes={readChanges(d)} locale={locale} /></>;
    case "asset_inspection.recorded": {
      const status = detailText(d, "status", 40);
      return <>{title}<Line>{t(`history.events.${k}.description`, { date: dateOnly("inspectionDate") })}</Line>{status ? <Line>{t("history.details.result", { status: isolate(status) })}</Line> : null}{notes}</>;
    }
    case "asset_maintenance.recorded":
      return <>{title}<Line>{t(`history.events.${k}.description`, { date: formatDateTime(detailText(d, "performedAt", 40), locale) })}</Line>{notes}</>;
    case "asset_document.link_added":
      return <>{title}<Line>{t(`history.events.${k}.description`, { name: name(["title"]) })}</Line></>;
    case "asset_document.uploaded":
    case "asset_document.deleted": {
      const size = detailNumber(d, "sizeBytes");
      const mime = detailText(d, "mimeType", 60);
      const source = d?.source === "LINK" || d?.source === "UPLOAD" ? d.source : null;
      const scan = typeof d?.scanStatus === "string" && ["NOT_SCANNED", "CLEAN", "INFECTED", "SCAN_FAILED"].includes(d.scanStatus) ? d.scanStatus : null;
      return (
        <>
          {title}
          <Line testId="history-document-name">{t(`history.events.${k}.description`, { name: name(["title", "originalName"]) })}</Line>
          {(size != null || mime || source || scan) ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground" data-testid="history-document-meta">
              {source ? <Badge variant="outline">{t(`history.details.source.${source}`)}</Badge> : null}
              {mime ? <span>{t("history.details.type", { type: isolateLtr(mime) })}</span> : null}
              {size != null ? <span>{t("history.details.size", { size: isolateLtr(formatFileSize(size, locale)) })}</span> : null}
              {scan ? <span>{t(`history.details.scan.${scan}`)}</span> : null}
            </div>
          ) : null}
          {kind === "asset_document.deleted" && d?.fileRemoved === true ? <Line>{t("history.details.fileRemoved")}</Line> : null}
        </>
      );
    }
    default:
      return null;
  }
}

export interface AssetHistoryTimelineProps {
  events: AssetHistoryEvent[];
  locale: string;
  hasMore: boolean;
  loadingMore: boolean;
  /** Loading the NEXT page failed; the events already shown stay. */
  loadMoreFailed: boolean;
  onLoadMore: () => void;
}

/** The timeline itself (presentational): newest first, one entry per event, "Load more" at the end. */
export function AssetHistoryTimeline({ events, locale, hasMore, loadingMore, loadMoreFailed, onLoadMore }: AssetHistoryTimelineProps) {
  const { t } = useTranslation("assets");
  return (
    <div className="space-y-4">
      <ol className="space-y-0" aria-label={t("history.listLabel")} data-testid="history-list">
        {events.map((event, index) => {
          const kind = eventKind(event);
          const last = index === events.length - 1;
          return (
            <li key={event.eventId} className="flex gap-3" data-testid={`history-event-${event.eventId}`} data-kind={kind}>
              <div className="flex flex-col items-center">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted text-muted-foreground" aria-hidden="true">{ICONS[kind] ?? <FileText className="h-4 w-4" />}</span>
                {last ? null : <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />}
              </div>
              <div className={`min-w-0 flex-1 space-y-1.5 ${last ? "" : "pb-6"}`}>
                <EventBody event={event} locale={locale} />
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  <span data-testid="history-actor" dir="auto">{t("history.by", { name: safeText(event.actorName, 60) ?? t("history.unknownActor") })}</span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={event.createdAt} data-testid="history-time">{formatDateTime(event.createdAt, locale)}</time>
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {loadMoreFailed ? (
        <Alert variant="destructive" data-testid="history-load-more-error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{t("history.loadMoreFailed")}</span>
            <Button size="sm" variant="outline" onClick={onLoadMore} disabled={loadingMore}>{t("history.retry")}</Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {hasMore && !loadMoreFailed ? (
        <div className="flex justify-center">
          <Button variant="outline" onClick={onLoadMore} disabled={loadingMore} aria-busy={loadingMore} className="w-full gap-2 sm:w-auto" data-testid="history-load-more">
            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loadingMore ? t("history.loadingMore") : t("history.loadMore")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
