import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, CircleDashed, Loader, X, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/i18n/formatters";
import { buildReportWorkflow, type StageState, type WorkflowStage } from "@/lib/reportWorkflow";
import type { MaintenanceReport } from "@/types/maintenanceReport";

const ICON: Record<StageState, typeof Check> = {
  done: Check,
  current: Loader,
  upcoming: CircleDashed,
  rejected: X,
  skipped: Minus,
};

const TONE: Record<StageState, string> = {
  done: "border-emerald-500 bg-emerald-500 text-white",
  current: "border-primary bg-primary/10 text-primary",
  upcoming: "border-border bg-background text-muted-foreground",
  rejected: "border-destructive bg-destructive text-destructive-foreground",
  skipped: "border-border bg-muted text-muted-foreground",
};

/**
 * Numbered workflow stepper shown at the top of the report page. Everything comes from
 * `buildReportWorkflow` (persisted status / actors / timestamps only): completed, current and upcoming
 * stages, the responsible ROLE for pending ones, the person only when stored, and the rejection or the
 * internal/external outcome exactly as persisted.
 */
export function ReportWorkflowStepper({ report }: { report: MaintenanceReport }) {
  const { t, i18n } = useTranslation("maintenanceReports");
  const workflow = buildReportWorkflow(report);
  const when = (v: string | null) =>
    v ? formatDate(v, i18n.language, { dateStyle: "medium", timeStyle: "short" }) : null;

  return (
    <nav aria-label={t("workflow.title")} className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{t("workflow.title")}</h2>
        <p className="text-xs text-muted-foreground" role="status">
          {workflow.terminal === "REJECTED"
            ? t("workflow.summaryRejected", { stage: t(`workflow.stage.${workflow.rejectedAtStage}`) })
            : workflow.terminal === "RESOLVED_INTERNAL"
              ? t("workflow.summaryInternal")
              : workflow.terminal === "RESOLVED_EXTERNAL"
                ? t("workflow.summaryExternal")
                : t("workflow.summaryWaiting", {
                    stage: t(`workflow.stage.${workflow.currentKey}`),
                    role: t(`workflow.role.${workflow.stages.find((s) => s.key === workflow.currentKey)?.role}`),
                  })}
        </p>
      </div>
      <ol className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {workflow.stages.map((stage, index) => (
          <StageItem key={stage.key} stage={stage} index={index} last={index === workflow.stages.length - 1} when={when} />
        ))}
      </ol>
    </nav>
  );
}

function StageItem({
  stage,
  index,
  last,
  when,
}: {
  stage: WorkflowStage;
  index: number;
  last: boolean;
  when: (v: string | null) => string | null;
}) {
  const { t } = useTranslation("maintenanceReports");
  const Icon = ICON[stage.state];
  const label =
    stage.key === "decision" && stage.state === "done" && stage.outcome
      ? t(`workflow.outcome.${stage.outcome}`)
      : stage.state === "rejected"
        ? t("workflow.rejectedAt", { stage: t(`workflow.stage.${stage.key}`) })
        : t(`workflow.stage.${stage.key}`);
  const at = when(stage.at);

  return (
    <li
      aria-current={stage.state === "current" ? "step" : undefined}
      className={cn("relative flex gap-3 md:flex-col md:gap-2", stage.state === "skipped" && "opacity-60")}
    >
      <div className="flex items-center gap-2 md:w-full">
        <span
          className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold", TONE[stage.state])}
          aria-hidden="true"
        >
          {stage.state === "done" || stage.state === "rejected" || stage.state === "skipped" ? (
            <Icon className="h-4 w-4" />
          ) : (
            <span dir="ltr">{index + 1}</span>
          )}
        </span>
        {!last && <span className="hidden h-0.5 flex-1 bg-border md:block" aria-hidden="true" />}
      </div>
      <div className="min-w-0 space-y-0.5 text-sm">
        <p className={cn("font-semibold", stage.state === "rejected" && "text-destructive")}>
          <span className="me-1 text-xs text-muted-foreground" dir="ltr">{index + 1}.</span>
          {label}
        </p>
        <p className="text-xs text-muted-foreground">{t(`workflow.state.${stage.state}`)}</p>
        {stage.person ? (
          <p className="text-xs" dir="auto">
            {t("workflow.by", { name: stage.person })}
          </p>
        ) : stage.state === "current" || stage.state === "upcoming" ? (
          <p className="text-xs text-muted-foreground">{t("workflow.awaitingRole", { role: t(`workflow.role.${stage.role}`) })}</p>
        ) : stage.state === "done" && !stage.recorded ? (
          <p className="text-xs text-muted-foreground">{t("workflow.notRecorded")}</p>
        ) : null}
        {at ? <p className="text-xs text-muted-foreground">{at}</p> : null}
        {stage.note ? <p className="whitespace-pre-wrap text-xs text-muted-foreground" dir="auto">{stage.note}</p> : null}
        {stage.link ? (
          <Link
            className="text-xs font-medium text-primary hover:underline"
            to={stage.link.type === "internal" ? `/internal-work-orders/${stage.link.id}` : `/station-requests/${stage.link.id}`}
          >
            {stage.link.type === "internal"
              ? t("details.internalWorkOrderLink", { id: stage.link.id })
              : t("details.externalRequestLink", { id: stage.link.id })}
          </Link>
        ) : null}
      </div>
    </li>
  );
}
