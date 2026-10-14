import { useTranslation } from "react-i18next";
import { Check, Circle, Clock, HelpCircle } from "lucide-react";
import type { TaskProgress as TaskProgressData } from "@/api/services/taskDetailService";
import { cn } from "@/lib/utils";

/**
 * Shared progress display for an internal task. Renders the server-computed `progress` (the same payload the
 * mobile app uses), so the web, the order page and the app can never disagree. A pending manager decision is
 * shown as its own state; unevidenced legacy stages are neutral, never "done".
 */
export default function TaskProgress({ progress, compact = false }: { progress: TaskProgressData | null; compact?: boolean }) {
  const { t, i18n } = useTranslation("tasks");
  if (!progress) {
    return <p className="text-xs text-muted-foreground" data-testid="task-progress-unavailable">{t("progress.unavailable")}</p>;
  }
  const visible = progress.stages.filter((s) => !(s.optional && (s.state === "upcoming" || s.state === "unknown")));
  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString(i18n.language, { dateStyle: "medium", timeStyle: "short" }) : null;

  return (
    <div data-testid="task-progress">
      <ol className={cn("flex gap-2", compact ? "flex-row flex-wrap" : "flex-col sm:flex-row sm:flex-wrap")}>
        {visible.map((stage) => {
          const done = stage.state === "done";
          const current = stage.state === "current";
          const waiting = stage.state === "awaiting_approval";
          const unknown = stage.state === "unknown";
          return (
            <li
              key={stage.key}
              data-stage={stage.key}
              data-state={stage.state}
              className={cn(
                "flex min-w-0 flex-1 items-start gap-2 rounded-md border p-2 text-xs",
                done && "border-emerald-500/40 bg-emerald-500/5",
                current && "border-primary bg-primary/5",
                waiting && "border-amber-500/60 bg-amber-500/10",
                (stage.state === "upcoming" || unknown) && "text-muted-foreground"
              )}
            >
              <span className="mt-0.5 shrink-0">
                {done ? <Check className="h-4 w-4 text-emerald-600" /> : waiting ? <Clock className="h-4 w-4 text-amber-600" /> : unknown ? <HelpCircle className="h-4 w-4" /> : <Circle className={cn("h-4 w-4", current && "fill-primary text-primary")} />}
              </span>
              <span className="min-w-0">
                <span className="block font-medium">{t(`progress.stages.${stage.key}`)}</span>
                <span className="block text-[11px] opacity-80">
                  {waiting
                    ? t("progress.awaitingApproval")
                    : unknown
                      ? t("progress.noRecord")
                      : stage.at
                        ? fmt(stage.at)
                        : current
                          ? t("progress.inProgress")
                          : ""}
                </span>
                {stage.by?.fullName && (done || current) ? (
                  <span className="block truncate text-[11px] opacity-80" dir="auto">{stage.by.fullName}</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
      {progress.awaitingApproval ? (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400" data-testid="task-progress-pending">
          {progress.pendingStage
            ? t("progress.pendingBanner", { stage: t(`progress.stages.${progress.pendingStage}`) })
            : t("progress.pendingBannerGeneric")}
        </p>
      ) : null}
      {progress.status === "PAUSED" || progress.status === "INSPECTING" || progress.status === "WAITING_PARTS" || progress.status === "RETURNING_MATERIALS" ? (
        <p className="mt-2 text-xs text-muted-foreground">{t("progress.substate", { status: t(`status.${progress.status}`) })}</p>
      ) : null}
    </div>
  );
}
