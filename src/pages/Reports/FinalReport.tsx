import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLoadError } from "@/components/DashboardLoadError";
import SourceReportAttachments from "@/components/SourceReportAttachments";
import { downloadFinalReportPdf, fetchFinalReport, type FinalReport as Report, type ReportEvent, type ReportRoot } from "@/api/services/finalReportService";
import { formatDate } from "@/lib/i18n/formatters";

type Translate = (key: string, options?: Record<string, unknown>) => string;

const dt = (v: string | null | undefined, lng: string) => (v ? formatDate(v, lng, { dateStyle: "medium", timeStyle: "short" }) : null);

function Section({ title, children, id }: { title: string; children: React.ReactNode; id: string }) {
  return (
    <Card data-testid={`report-section-${id}`}>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function Facts({ rows, none }: { rows: [string, string | null | undefined][]; none: string }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[minmax(8rem,12rem)_1fr]">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd dir="auto" className={value ? "whitespace-pre-wrap break-words" : "text-muted-foreground"}>{value || none}</dd>
        </div>
      ))}
    </dl>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

/** Plain responsive table: scrolls sideways inside its card on a phone, never the whole page. */
function Table({ head, rows, testId }: { head: string[]; rows: (React.ReactNode)[][]; testId?: string }) {
  return (
    <div className="overflow-x-auto" data-testid={testId}>
      <table className="w-full min-w-[32rem] text-sm">
        <thead><tr className="text-xs text-muted-foreground">{head.map((h) => <th key={h} className="py-1 pe-3 text-start font-medium">{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t align-top">{r.map((c, j) => <td key={j} className="py-2 pe-3" dir="auto">{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface FinalReportViewProps {
  report: Report;
  lng: string;
  t: Translate;
  ta: Translate; // the activity namespace: event kinds and statuses, shared with the timeline
  header?: React.ReactNode;
}

function kindText(e: ReportEvent, ta: Translate): string {
  const stage = typeof e.meta?.stage === "string" ? e.meta.stage : null;
  const provider = e.meta?.provider?.name;
  if (e.kind === "REPORT_REJECTED" && stage) return ta(`kinds.REPORT_REJECTED_${stage}`);
  if (e.kind === "EXTERNAL_REPORT_REVIEWED" && stage) return ta(`kinds.EXTERNAL_REPORT_REVIEWED_${stage}`, { defaultValue: ta("kinds.EXTERNAL_REPORT_REVIEWED") });
  if (e.kind === "EXTERNAL_JOB_EVENT" && e.meta?.eventType) return ta(`kinds.jobEvents.${e.meta.eventType}`, { defaultValue: ta("kinds.EXTERNAL_JOB_EVENT") });
  if (e.kind === "TASK_ASSIGNED" && e.meta?.assignee) return ta("kinds.TASK_ASSIGNED_TO", { name: e.meta.assignee });
  if (e.kind === "TASK_REASSIGNED" && e.meta?.fromPerson && e.meta?.toPerson) return ta("kinds.TASK_REASSIGNED_FROM_TO", { from: e.meta.fromPerson, to: e.meta.toPerson });
  if (provider && e.kind.startsWith("EXTERNAL_")) return ta(`kinds.${e.kind}_NAMED`, { provider, defaultValue: ta(`kinds.${e.kind}`, { defaultValue: e.kind }) });
  return ta(`kinds.${e.kind}`, { defaultValue: e.kind });
}

export function FinalReportView({ report, lng, t, ta, header }: FinalReportViewProps) {
  const none = t("none");
  const status = (code: string | null | undefined) => (code ? ta(`status.${code}`, { defaultValue: code }) : none);
  const actor = (e: ReportEvent) => e.actor ?? (e.actorLabel ? ta(`actorLabels.${e.actorLabel}`, { defaultValue: e.actorLabel }) : none);
  const when = (v: string | null | undefined) => dt(v, lng) ?? none;
  const rtl = lng.startsWith("ar");
  const stationName = report.station ? (rtl ? report.station.nameAr || report.station.nameEn : report.station.nameEn || report.station.nameAr) : null;
  const providerName = report.provider ? (rtl ? report.provider.nameAr || report.provider.name : report.provider.name) : null;
  const tone = report.stage === "FINAL" ? "border-green-600/50 bg-green-50 text-green-900 dark:bg-green-950/30 dark:text-green-200" : report.stage === "CANCELLED" ? "border-destructive/50 bg-destructive/5 text-destructive" : "border-amber-500/50 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200";
  const transition = (e: ReportEvent) => (e.from && e.to && e.from !== e.to ? `${status(e.from)} › ${status(e.to)}` : e.to ? status(e.to) : null);
  const authFiles = report.photos.filter((p) => p.source === "REPORT" && p.url);
  const plainFiles = report.photos.filter((p) => p.source !== "REPORT");
  const phases = ["BEFORE", "DURING", "AFTER"];
  const otherPhases = [...new Set(plainFiles.map((p) => p.phase))].filter((p) => !phases.includes(p));

  return (
    <div className="space-y-5" data-testid="final-report" data-stage={report.stage}>
      {header}
      <Card className={`border ${tone}`} data-testid="report-stage">
        <CardContent className="space-y-1 py-4">
          <p className="font-semibold">{t(`stage.${report.stage}`)}</p>
          <p className="text-sm opacity-90">{t(`stageNote.${report.stage}`)}</p>
        </CardContent>
      </Card>

      <Section id="summary" title={t("sections.summary")}>
        <Facts none={none} rows={[
          [t("reference"), report.reference],
          [t("requestNo"), report.request.number],
          [t("type"), report.kind === "EXTERNAL" ? t("external") : t("internal")],
          [t("status"), status(report.status)],
          [t("f.station"), stationName],
          [t("f.address"), report.station?.address],
          [t("f.asset"), report.asset ? [report.asset.name, report.asset.type, report.asset.model].filter(Boolean).join(" · ") : null],
          [t("f.serial"), report.asset?.serialNumber],
          [t("f.location"), report.asset?.location],
          [t("f.title"), report.request.title],
          [t("f.description"), report.request.description ?? report.source?.description],
          [t("f.priority"), report.request.priority ? t(`priorityValue.${report.request.priority}`, { defaultValue: report.request.priority }) : null],
          [t("f.reportedAt"), dt(report.source?.reportedAt ?? report.request.createdAt, lng)],
          [t("f.reportedBy"), report.source?.reportedBy ?? report.request.createdBy],
          [t("f.createdAt"), dt(report.request.createdAt, lng)],
          [t("f.createdBy"), report.request.createdBy],
        ]} />
      </Section>

      {report.kind === "INTERNAL" ? (
        <Section id="team" title={t("sections.team")}>
          {report.team.length === 0 ? <Empty text={t("nothing")} /> : (
            <Table testId="report-team" head={[t("f.assignee"), t("f.taskStatus"), t("f.accepted"), t("f.started"), t("f.completed"), t("f.closed")]}
              rows={report.team.map((m) => [m.assignee ?? none, status(m.status), when(m.acceptedAt), when(m.startedAt), when(m.completedAt), when(m.closedAt)])} />
          )}
        </Section>
      ) : (
        <Section id="provider" title={t("sections.provider")}>
          {!report.provider ? <Empty text={t("nothing")} /> : (
            <Facts none={none} rows={[
              [t("f.providerName"), providerName],
              ...(report.execution?.jobs.length ? ([[t("f.jobStatus"), status(report.execution.jobs[report.execution.jobs.length - 1].status)], [t("f.activatedAt"), dt(report.execution.jobs[report.execution.jobs.length - 1].activatedAt, lng)]] as [string, string | null][]) : []),
            ]} />
          )}
        </Section>
      )}

      <Section id="work" title={t("sections.work")}>
        {report.work.entries.length === 0 && report.work.materialsSummaries.length === 0 ? (
          <Empty text={report.kind === "EXTERNAL" && report.execution === null ? t("restricted") : t("nothing")} />
        ) : null}
        {report.work.entries.map((e, i) => (
          <div key={i} className="rounded-md border p-3" data-testid="report-work-entry">
            {report.kind === "INTERNAL" ? (
              <Facts none={none} rows={[
                [t("f.assignee"), e.assignee ?? null], [t("f.inspection"), e.inspection], [t("f.problemFound"), e.problemFound], [t("f.workPerformed"), e.workPerformed], [t("f.completionReport"), e.completionReport], [t("f.notes"), e.notes],
              ].filter(([, v]) => v) as [string, string | null][]} />
            ) : (
              <Facts none={none} rows={[[t("f.reportedAt"), dt(e.submittedAt, lng)], [t("f.findings"), e.findings], [t("f.actions"), e.actionsTaken], [t("f.recommendations"), e.recommendations], [t("status"), status(e.status)]]} />
            )}
          </div>
        ))}
        {report.work.materialsSummaries.map((m) => (
          <Facts key={m.taskId} none={none} rows={[[t("f.materialsUsed"), m.used], [t("f.materialsReturned"), m.returned]].filter(([, v]) => v) as [string, string | null][]} />
        ))}
        {report.execution && report.execution.visits.length > 0 ? (
          <>
            <h3 className="pt-2 text-sm font-semibold">{t("sections.visits")}</h3>
            <Table head={[t("f.visitDate"), t("f.taskStatus"), t("f.checkedIn"), t("f.completed"), t("f.visitNote")]}
              rows={report.execution.visits.map((v) => [dt(v.date, lng), status(v.status), when(v.checkedInAt), when(v.completedAt), v.completionNote ?? none])} />
          </>
        ) : null}
      </Section>

      <Section id="progress" title={t("sections.progress")}>
        {report.progress.length === 0 ? <Empty text={t("nothing")} /> : (
          <Table testId="report-progress" head={[t("f.when"), t("f.what"), t("f.who")]}
            rows={report.progress.map((e) => [when(e.at), [kindText(e, ta), transition(e)].filter(Boolean).join(" — "), actor(e)])} />
        )}
      </Section>

      <Section id="approvals" title={t("sections.approvals")}>
        {report.approvals.length === 0 ? <Empty text={t("nothing")} /> : (
          <Table testId="report-approvals" head={[t("f.when"), t("f.what"), t("f.decision"), t("f.who"), t("f.notes")]}
            rows={report.approvals.map((e) => [when(e.at), kindText(e, ta), <Badge key="d" variant={e.decision === "REJECTED" ? "destructive" : "secondary"}>{t(`decisionValue.${e.decision ?? "APPROVED"}`)}</Badge>, actor(e), e.message ?? none])} />
        )}
      </Section>

      <Section id="comments" title={t("sections.comments")}>
        {report.comments.length === 0 ? <Empty text={t("nothing")} /> : (
          <Table testId="report-comments" head={[t("f.when"), t("f.who"), t("f.what"), t("f.notes")]}
            rows={report.comments.map((e) => [when(e.at), actor(e), kindText(e, ta), e.message ?? none])} />
        )}
      </Section>

      <Section id="photos" title={t("sections.photos")}>
        {report.photos.length === 0 ? <Empty text={t("nothing")} /> : null}
        {authFiles.length > 0 ? (
          <SourceReportAttachments attachments={authFiles.map((p) => ({ id: Number(String(p.id).replace(/\D/g, "")) || 0, fileType: p.fileType ?? "OTHER", caption: p.caption, downloadUrl: p.url! }))} />
        ) : null}
        {[...phases, ...otherPhases].map((phase) => {
          const items = plainFiles.filter((p) => p.phase === phase);
          if (items.length === 0) return null;
          return (
            <div key={phase} className="space-y-2" data-testid={`report-photos-${phase}`}>
              <h3 className="text-sm font-semibold">{t(`phase.${phase}`, { defaultValue: phase })}</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {items.map((p) => (
                  <figure key={p.id} className="space-y-1">
                    {p.url && p.fileType === "IMAGE" ? (
                      <a href={p.url} target="_blank" rel="noopener noreferrer"><img src={p.url} alt={p.caption ?? ""} loading="lazy" className="h-28 w-full rounded-md border object-cover" /></a>
                    ) : (
                      <div className="flex h-28 items-center justify-center rounded-md border text-xs text-muted-foreground">{t("attachedNotShown")}</div>
                    )}
                    <figcaption className="text-xs text-muted-foreground" dir="auto">{[p.caption, [dt(p.at, lng), p.by].filter(Boolean).join(" · ")].filter(Boolean).join(" — ")}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          );
        })}
      </Section>

      {report.kind === "INTERNAL" && report.parts ? (
        <Section id="parts" title={t("sections.parts")}>
          {report.parts.restricted ? <Empty text={t("restricted")} /> : report.parts.orders.length === 0 ? <Empty text={t("nothing")} /> : (
            <>
              {report.parts.orders.map((o) => (
                <div key={o.id} className="space-y-2" data-testid="report-parts-order">
                  <h3 className="text-sm font-semibold" dir="auto">{t("f.request")} #{o.id} — {status(o.status)}{o.requestedBy ? ` — ${o.requestedBy}` : ""}{o.createdAt ? ` — ${dt(o.createdAt, lng)}` : ""}</h3>
                  <Table head={[t("f.part"), t("f.requested"), t("f.approved"), t("f.issued"), t("f.used"), t("f.returned"), t("f.usedStatus")]}
                    rows={o.lines.map((l) => [
                      `${l.partName}${l.partCode ? ` (${l.partCode})` : ""}${l.status === "NOT_AVAILABLE" ? ` — ${ta("status.NOT_AVAILABLE", { defaultValue: "" })}` : ""}`,
                      l.requested, l.approved ?? none, l.issued ?? none, l.used ?? none, l.returned ?? none,
                      <span key="b" data-testid="used-basis" data-basis={l.usedBasis} className={l.usedBasis === "DEFAULT_OR_UNCONFIRMED" ? "text-amber-700 dark:text-amber-300" : undefined}>{t(`usedBasis.${l.usedBasis}`)}</span>,
                    ])} />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">{t("partsNote")}</p>
            </>
          )}
        </Section>
      ) : null}

      <Section id="completion" title={t("sections.completion")}>
        <Facts none={none} rows={[[t("f.maintenanceCompleted"), dt(report.completion.completedAt, lng)], [t("f.reviewedAt"), dt(report.completion.reviewedAt, lng)], [t("f.closedOn"), dt(report.completion.closedAt, lng)], [t("f.confirmedBy"), report.completion.closedBy]]} />
      </Section>

      <Section id="outcome" title={t("sections.outcome")}>
        <p className="font-medium" data-testid="report-outcome">{t(`outcomeText.${report.outcome.code}`)}</p>
        {report.completion.basis ? <p className="text-sm text-muted-foreground">{t(`basis.${report.completion.basis}`, { defaultValue: report.completion.basis })}</p> : null}
        {report.missing.length > 0 ? <p className="text-xs text-muted-foreground" data-testid="report-legacy-note">{t("legacyNote")}</p> : null}
        <p className="text-xs text-muted-foreground">{t("generatedNote", { when: dt(report.generatedAt, lng) ?? "" })}</p>
      </Section>
    </div>
  );
}

const KNOWN_STATUS: Record<number, string> = { 403: "noAccess", 404: "noAccess", 503: "busy" };

/** One page for both workflows: the work order of an internal maintenance and the external request. */
export default function FinalReportPage({ root }: { root: ReportRoot }) {
  const { t, i18n } = useTranslation("finalReport");
  const { t: ta } = useTranslation("activity");
  const { id } = useParams<{ id: string }>();
  const [pdfLang, setPdfLang] = useState<"en" | "ar">(i18n.language.startsWith("ar") ? "ar" : "en");
  const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: ["final-report", root, id], queryFn: () => fetchFinalReport(root, id as string), enabled: !!id, retry: false, refetchOnWindowFocus: false });
  const backTo = root === "workOrder" ? `/internal-work-orders/${id}` : `/station-requests/${id}`;
  const status = (q.error as { response?: { status?: number } } | null)?.response?.status ?? null;

  const download = async () => {
    if (!q.data || busy) return;
    setBusy(true);
    try {
      await downloadFinalReportPdf(root, id as string, pdfLang, q.data.reference);
    } catch (e) {
      const s = (e as { response?: { status?: number } })?.response?.status ?? 0;
      toast.error(t(KNOWN_STATUS[s] === "busy" ? "busy" : "downloadFailed"));
    } finally {
      setBusy(false);
    }
  };

  const header = q.data ? (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold" dir="auto">{t("title")} · {q.data.reference}</h1>
          <p className="text-sm text-muted-foreground" dir="auto">{q.data.request.title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t("downloadIn")}</span>
            <select className="h-9 rounded-md border bg-background px-2 text-sm" value={pdfLang} onChange={(e) => setPdfLang(e.target.value as "en" | "ar")} data-testid="pdf-language">
              <option value="en">{t("english")}</option>
              <option value="ar">{t("arabic")}</option>
            </select>
          </label>
          <Button onClick={download} disabled={busy} data-testid="download-pdf">
            {busy ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Download className="me-2 h-4 w-4" />}
            {busy ? t("downloading") : t("download")}
          </Button>
        </div>
      </CardContent>
    </Card>
  ) : null;

  return (
    <div className="space-y-5 p-4 md:p-8">
      <Button variant="ghost" asChild>
        <Link to={backTo} className="gap-2"><ChevronLeft className="h-4 w-4 rtl:rotate-180" /> {t("back")}</Link>
      </Button>
      {q.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}</p>
      ) : q.isError ? (
        status === 403 || status === 404 ? <p className="text-destructive" role="alert" data-testid="report-no-access">{t("noAccess")}</p>
          : <DashboardLoadError error={q.error} fallbackMessage={t("loadFailed")} onRetry={() => q.refetch()} />
      ) : q.data ? (
        <FinalReportView report={q.data} lng={i18n.language} t={t as unknown as Translate} ta={ta as unknown as Translate} header={header} />
      ) : null}
    </div>
  );
}
