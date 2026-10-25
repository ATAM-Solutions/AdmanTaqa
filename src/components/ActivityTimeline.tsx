import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight, Building2, CheckCircle2, FileText, GitBranch, Loader2, Lock, MessageSquare, Package, Paperclip, RefreshCw, UserCog, XCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import SourceReportAttachments from "@/components/SourceReportAttachments";
import { useAuth } from "@/context/AuthContext";
import { canAccessPath } from "@/lib/accessControl";
import { actorLabelKey, emphasisOf, groupByDay, hasTransition, relatedTaskIds, titleKey } from "@/lib/activityTimeline";
import { formatDate } from "@/lib/i18n/formatters";
import { useActivity } from "@/hooks/Activity/useActivity";
import type { ActivityEvent, ActivityOrder, ActivityRoot } from "@/types/activity";

const ICONS: Record<string, typeof FileText> = {
  REPORT: FileText,
  DECISION: GitBranch,
  APPROVAL: CheckCircle2,
  ASSIGNMENT: UserCog,
  STATUS: RefreshCw,
  COMMENT: MessageSquare,
  ATTACHMENT: Paperclip,
  WAREHOUSE: Package,
  PROVIDER: Building2,
  CLOSURE: Lock,
};

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** The title of an event, with the people / provider named when the server resolved them. */
function eventTitle(e: ActivityEvent, t: Translate): string {
  const k = (key: string, options?: Record<string, unknown>) => t(`kinds.${key}`, options);
  const provider = e.meta?.provider?.name;
  switch (e.kind) {
    case "TASK_ASSIGNED":
      return e.meta?.assignee?.name ? k("TASK_ASSIGNED_TO", { name: e.meta.assignee.name }) : k("TASK_ASSIGNED");
    case "TASK_REASSIGNED":
      return e.meta?.from?.name && e.meta?.to?.name ? k("TASK_REASSIGNED_FROM_TO", { from: e.meta.from.name, to: e.meta.to.name }) : k("TASK_REASSIGNED");
    case "EXTERNAL_SENT_TO_PROVIDER":
    case "EXTERNAL_QUOTE_SUBMITTED":
    case "EXTERNAL_QUOTE_REJECTED":
    case "EXTERNAL_QUOTE_SELECTED":
      return provider ? k(`${e.kind}_NAMED`, { provider }) : k(e.kind);
    default: {
      const key = titleKey(e);
      return t(`kinds.${key}`, { defaultValue: t(`kinds.${e.kind}`, { defaultValue: e.kind }) });
    }
  }
}

function Attachments({ event }: { event: ActivityEvent }) {
  const { t } = useTranslation("activity");
  if (event.attachments.length === 0) return null;
  const authenticated = event.attachments.filter((a) => !!a.downloadUrl);
  const stored = event.attachments.filter((a) => !a.downloadUrl && a.url);
  return (
    <div className="mt-2 space-y-2" data-testid={`activity-files-${event.id}`}>
      {authenticated.length > 0 ? (
        <SourceReportAttachments
          attachments={authenticated.map((a) => ({ id: a.id, fileType: a.fileType ?? "OTHER", caption: a.caption, downloadUrl: a.downloadUrl! }))}
        />
      ) : null}
      {stored.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {stored.map((a) => (
            <a
              key={a.id}
              href={a.url!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-md border bg-muted/30 text-xs hover:bg-muted/60"
              title={a.caption ?? t("viewFile")}
            >
              {a.fileType === "IMAGE" ? <img src={a.url!} alt={a.caption ?? t("viewFile")} className="h-full w-full object-cover" loading="lazy" /> : <FileText className="h-6 w-6 text-muted-foreground" />}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function EventItem({ event }: { event: ActivityEvent }) {
  const { t, i18n } = useTranslation("activity");
  const { organization, permissions } = useAuth();
  const emphasis = emphasisOf(event);
  const Icon = emphasis === "rejection" ? XCircle : (ICONS[event.category] ?? RefreshCw);
  const label = actorLabelKey(event);
  const tasks = relatedTaskIds(event);
  const canOpenTask = (id: number) => canAccessPath(`/internal-tasks/${id}`, organization?.type, permissions);
  const status = (code: string) => t(`status.${code}`, { defaultValue: code });
  const tone =
    emphasis === "rejection"
      ? "border-destructive/50 bg-destructive/5"
      : emphasis === "decision"
        ? "border-primary/40 bg-primary/5"
        : "border-border bg-card";
  const iconTone = emphasis === "rejection" ? "text-destructive" : emphasis === "decision" ? "text-primary" : "text-muted-foreground";
  return (
    <li className="relative ps-8" data-testid={`activity-event-${event.id}`} data-kind={event.kind} data-emphasis={emphasis}>
      <span className={`absolute start-0 top-1 flex h-6 w-6 items-center justify-center rounded-full border bg-background ${iconTone}`} aria-hidden="true">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className={`rounded-lg border p-3 ${tone}`}>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold" dir="auto">{eventTitle(event, t as unknown as Translate)}</p>
          {emphasis === "decision" ? <Badge variant="default" className="text-[10px]">{t("importantBadge")}</Badge> : null}
          {event.meta?.historical ? <Badge variant="outline" className="text-[10px]">{t("actorLabels.UNRECORDED")}</Badge> : null}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground" data-testid={`activity-meta-${event.id}`}>
          <span dir="auto">{label ? t(`actorLabels.${label}`) : t("by", { name: event.actor?.name })}</span>
          {" · "}
          <time dateTime={event.occurredAt} dir="ltr">
            {formatDate(event.occurredAt, i18n.language, { hour: "2-digit", minute: "2-digit" })}
          </time>
        </p>
        {hasTransition(event) ? (
          <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs" data-testid={`activity-transition-${event.id}`}>
            <Badge variant="outline">{status(event.from!)}</Badge>
            <ArrowRight className="h-3 w-3 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
            <Badge variant="secondary">{status(event.to!)}</Badge>
          </p>
        ) : null}
        {event.message ? (
          <div className="mt-2 rounded-md bg-muted/50 px-3 py-2" data-testid={`activity-message-${event.id}`}>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{emphasis === "rejection" ? t("reason") : t("comment")}</p>
            <p className="whitespace-pre-wrap text-sm" dir="auto">{event.message}</p>
          </div>
        ) : null}
        <Attachments event={event} />
        {tasks.length > 0 && event.kind !== "TASK_COMMENT" && event.kind !== "TASK_STATUS_CHANGED" ? (
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {tasks.map((id) =>
              canOpenTask(id) ? (
                <Link key={id} to={`/internal-tasks/${id}`} className="rounded border px-1.5 py-0.5 hover:bg-muted" dir="ltr">
                  {t("task", { id })}
                </Link>
              ) : (
                <span key={id} className="rounded border px-1.5 py-0.5" dir="ltr">{t("task", { id })}</span>
              ),
            )}
          </p>
        ) : null}
      </div>
    </li>
  );
}

export interface ActivityViewState {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  events: ActivityEvent[];
  total: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
}

interface ActivityTimelineViewProps {
  state: ActivityViewState;
  order: ActivityOrder;
  onOrderChange: (order: ActivityOrder) => void;
}

/** Presentation only: loading, error, empty and the grouped events, from an explicit state. */
export function ActivityTimelineView({ state, order, onOrderChange }: ActivityTimelineViewProps) {
  const { t, i18n } = useTranslation("activity");
  const groups = groupByDay(state.events);

  if (state.isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" data-testid="activity-loading">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (state.isError) {
    const status = (state.error as { response?: { status?: number } } | null)?.response?.status;
    const kind = status === 401 || status === 403 ? "forbidden" : status === 404 ? "notFound" : status == null ? "network" : "server";
    return (
      <Alert variant="destructive" data-testid="activity-error">
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {t("loadFailed")} {t(`errors.${kind}`)}
          </span>
          {kind === "network" || kind === "server" ? (
            <Button size="sm" variant="outline" onClick={() => state.refetch()} data-testid="activity-retry">
              {t("retry")}
            </Button>
          ) : null}
        </AlertDescription>
      </Alert>
    );
  }

  if (state.events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="activity-empty">
        {t("empty")}
      </p>
    );
  }

  return (
    <div className="space-y-4" data-testid="activity-timeline">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground" data-testid="activity-count">{t("showing", { shown: state.events.length, total: state.total })}</p>
        <div className="flex items-center gap-1" role="group" aria-label={t("order.label")}>
          {(["asc", "desc"] as const).map((o) => (
            <Button key={o} size="sm" variant={order === o ? "default" : "outline"} className="h-7 px-2 text-xs" aria-pressed={order === o} data-testid={`activity-order-${o}`} onClick={() => onOrderChange(o)}>
              {t(`order.${o}`)}
            </Button>
          ))}
        </div>
      </div>

      {groups.map((g) => (
        <section key={g.key} aria-label={g.key} data-testid={`activity-day-${g.key}`}>
          <h4 className="sticky top-0 z-10 mb-2 bg-background/90 py-1 text-xs font-semibold text-muted-foreground backdrop-blur">
            {formatDate(g.events[0].occurredAt, i18n.language, { dateStyle: "full" })}
          </h4>
          <ol className="relative space-y-3 before:absolute before:start-3 before:top-2 before:bottom-2 before:w-px before:bg-border">
            {g.events.map((e) => (
              <EventItem key={e.id} event={e} />
            ))}
          </ol>
        </section>
      ))}

      {state.hasNextPage ? (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" disabled={state.isFetchingNextPage} onClick={() => state.fetchNextPage()} data-testid="activity-load-more">
            {state.isFetchingNextPage ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
            {state.isFetchingNextPage ? t("loadingMore") : t("loadMore")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

interface ActivityTimelineProps {
  root: ActivityRoot;
  id: number | string | undefined;
  /** Newest first suits long histories; the default reads like a story (oldest first). */
  defaultOrder?: ActivityOrder;
}

/**
 * The business activity of ONE record: grouped by day, each event with who, when, the comment or reason, the status change
 * and its files. Loaded in bounded pages. Everything shown comes from the API, which applies the record's own company,
 * station, task and provider visibility rules.
 */
export default function ActivityTimeline({ root, id, defaultOrder = "asc" }: ActivityTimelineProps) {
  const [order, setOrder] = useState<ActivityOrder>(defaultOrder);
  const query = useActivity(root, id, order);
  const events = query.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <ActivityTimelineView
      order={order}
      onOrderChange={setOrder}
      state={{
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        events,
        total: query.data?.pages[0]?.pagination.total ?? 0,
        hasNextPage: !!query.hasNextPage,
        isFetchingNextPage: query.isFetchingNextPage,
        fetchNextPage: () => void query.fetchNextPage(),
        refetch: () => void query.refetch(),
      }}
    />
  );
}
