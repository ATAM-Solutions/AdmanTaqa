import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Building2, FileText, Calendar, ListOrdered, ClipboardList, Check, ExternalLink } from "lucide-react";
import useAuthorityExternalJobOrderById from "@/hooks/AuthorityExternalJobOrders/useAuthorityExternalJobOrderById";
import useAuthorityExternalJobOrderTimeline from "@/hooks/AuthorityExternalJobOrders/useAuthorityExternalJobOrderTimeline";
import useAuthorityExternalJobOrderReports from "@/hooks/AuthorityExternalJobOrders/useAuthorityExternalJobOrderReports";
import { formatDate } from "@/lib/i18n/formatters";
import type { TFunction } from "i18next";

function getStatusBadgeVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  if (["COMPLETED", "DONE", "CLOSED", "APPROVED"].includes(status)) return "secondary";
  if (["ACTIVE", "IN_PROGRESS"].includes(status)) return "default";
  if (["REJECTED", "CANCELLED"].includes(status)) return "destructive";
  return "outline";
}

interface ChecklistItem {
  item?: string;
  checked?: boolean;
}

interface ReportAttachment {
  fileUrl?: string;
  category?: string;
  publicId?: string;
  visitId?: number;
  uploadedAt?: string;
  uploadedByUserId?: number;
  description?: string | null;
}

interface MaintenanceReportItem {
  id?: number;
  status?: string;
  findings?: string | null;
  actionsTaken?: string | null;
  recommendations?: string | null;
  checklistJson?: ChecklistItem[] | null;
  attachments?: ReportAttachment[] | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  rejectionReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
  SubmittedBy?: { id?: number; fullName?: string } | null;
  ReviewedBy?: { id?: number; fullName?: string } | null;
}

function ReportCard({ report: r, t, locale }: { report: MaintenanceReportItem; t: TFunction; locale: string }) {
  const fmt = (s: string | undefined | null) => (s ? formatDate(s, locale, { dateStyle: "medium", timeStyle: "short", hour12: true }) : "—");
  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {r.status != null && (
          <Badge variant={r.status === "APPROVED" ? "secondary" : "outline"}>{r.status}</Badge>
        )}
        {r.submittedAt != null && (
          <span className="text-xs text-muted-foreground">{t("externalJobOrders.detail.report.submitted", { date: fmt(r.submittedAt) })}</span>
        )}
        {r.SubmittedBy?.fullName != null && (
          <span className="text-xs text-muted-foreground">{t("externalJobOrders.detail.report.by", { name: r.SubmittedBy.fullName })}</span>
        )}
      </div>

      {r.findings != null && String(r.findings).trim() !== "" && (
        <div>
          <p className="text-[10px] text-muted-foreground uppercase mb-1">{t("externalJobOrders.detail.report.findings")}</p>
          <p className="text-sm">{r.findings}</p>
        </div>
      )}
      {r.actionsTaken != null && String(r.actionsTaken).trim() !== "" && (
        <div>
          <p className="text-[10px] text-muted-foreground uppercase mb-1">{t("externalJobOrders.detail.report.actionsTaken")}</p>
          <p className="text-sm">{r.actionsTaken}</p>
        </div>
      )}
      {r.recommendations != null && String(r.recommendations).trim() !== "" && (
        <div>
          <p className="text-[10px] text-muted-foreground uppercase mb-1">{t("externalJobOrders.detail.report.recommendations")}</p>
          <p className="text-sm">{r.recommendations}</p>
        </div>
      )}

      {Array.isArray(r.checklistJson) && r.checklistJson.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground uppercase mb-2">{t("externalJobOrders.detail.report.checklist")}</p>
          <ul className="space-y-1.5">
            {r.checklistJson.map((row, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm">
                {row.checked ? (
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                ) : (
                  <span className="h-4 w-4 rounded border border-muted-foreground/50 shrink-0" />
                )}
                <span>{row.item ?? "—"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {Array.isArray(r.attachments) && r.attachments.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground uppercase mb-2">{t("externalJobOrders.detail.report.attachments")}</p>
          <ul className="space-y-2">
            {r.attachments.map((att, idx) => (
              <li key={idx} className="flex flex-wrap items-center gap-2 text-sm">
                <a
                  href={att.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  {att.category
                    ? `${att.category} — ${t("externalJobOrders.detail.report.open")}`
                    : att.description && String(att.description).trim()
                      ? `${att.description} — ${t("externalJobOrders.detail.report.open")}`
                      : t("externalJobOrders.detail.report.open")}
                </a>
                {att.uploadedAt != null && (
                  <span className="text-muted-foreground text-xs">
                    {fmt(att.uploadedAt)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(r.reviewedAt != null || r.ReviewedBy?.fullName != null) && (
        <div className="pt-2 border-t text-xs text-muted-foreground">
          {r.reviewedAt != null && <span>{t("externalJobOrders.detail.report.reviewed", { date: fmt(r.reviewedAt) })}</span>}
          {r.ReviewedBy?.fullName != null && <span> {t("externalJobOrders.detail.report.by", { name: r.ReviewedBy.fullName })}</span>}
        </div>
      )}
      {r.reviewNote != null && String(r.reviewNote).trim() !== "" && (
        <p className="text-xs text-muted-foreground"><span className="font-medium">{t("externalJobOrders.detail.report.reviewNote")}</span> {r.reviewNote}</p>
      )}
      {r.rejectionReason != null && String(r.rejectionReason).trim() !== "" && (
        <p className="text-xs text-destructive"><span className="font-medium">{t("externalJobOrders.detail.report.rejectionReason")}</span> {r.rejectionReason}</p>
      )}
    </div>
  );
}

export default function AuthorityExternalJobOrderDetail() {
  const { t, i18n } = useTranslation("authority");
  const { id } = useParams<{ id: string }>();
  const { data: jobOrder, isLoading: loadingDetail, isError: errorDetail, error: detailError } = useAuthorityExternalJobOrderById(id);
  const { data: timeline = [], isLoading: loadingTimeline, isError: errorTimeline, error: timelineError } = useAuthorityExternalJobOrderTimeline(id);
  const { data: reports = [], isLoading: loadingReports, isError: errorReports, error: reportsError } = useAuthorityExternalJobOrderReports(id);

  if (loadingDetail || !id) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center min-h-[200px] text-muted-foreground">
        {t("externalJobOrders.detail.loading")}
      </div>
    );
  }

  if (errorDetail || !jobOrder) {
    return (
      <div className="p-4 md:p-8 space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/external-job-orders" className="gap-2">
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" /> {t("externalJobOrders.detail.backToList")}
          </Link>
        </Button>
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-destructive">
          {detailError instanceof Error ? detailError.message : t("externalJobOrders.detail.loadFailed")}
        </div>
      </div>
    );
  }

  const req = jobOrder.ExternalRequest;
  const quote = jobOrder.ProviderQuote;
  const branch = req?.Branch ?? jobOrder.Branch;
  const org = req?.Organization;

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full shadow-sm border border-transparent hover:border-border">
            <Link to="/external-job-orders">
              <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">{t("externalJobOrders.detail.title")}</h1>
              <Badge variant={getStatusBadgeVariant(jobOrder.status ?? "")}>
                {jobOrder.status ?? "—"}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              {jobOrder.createdAt
                ? formatDate(jobOrder.createdAt, i18n.language, { dateStyle: "medium", timeStyle: "short", hour12: true })
                : "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b bg-muted/30 py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {t("externalJobOrders.detail.detailsCardTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {req && (
                <div className="space-y-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    {t("externalJobOrders.detail.externalRequest")}
                  </p>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase mb-1">{t("externalJobOrders.detail.status")}</p>
                    <Badge variant={req.status === "ACTIVE" ? "default" : "outline"}>
                      {req.status ?? "—"}
                    </Badge>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      {t("externalJobOrders.detail.formData")}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase mb-1">{t("externalJobOrders.detail.formTitle")}</p>
                        <p className="text-sm font-medium">{req.formData?.title ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase mb-1">{t("externalJobOrders.detail.priority")}</p>
                        <Badge variant="outline" className="font-normal">
                          {req.formData?.priority ?? "—"}
                        </Badge>
                      </div>
                    </div>
                    {req.formData?.description != null && String(req.formData.description).trim() !== "" && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase mb-1">{t("externalJobOrders.detail.description")}</p>
                        <p className="text-sm text-muted-foreground">{String(req.formData.description)}</p>
                      </div>
                    )}
                    {Array.isArray(req.formData?.attachments) && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase mb-1">{t("externalJobOrders.detail.attachments")}</p>
                        <p className="text-sm text-muted-foreground">
                          {req.formData.attachments.length === 0
                            ? t("externalJobOrders.detail.attachmentsNone")
                            : t("externalJobOrders.detail.attachmentsCount", { count: req.formData.attachments.length })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {quote && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    {t("externalJobOrders.detail.providerQuote")}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="outline">{quote.status ?? "—"}</Badge>
                    {quote.version != null && <span className="text-sm text-muted-foreground">v{quote.version}</span>}
                    {quote.createdAt && (
                      <span className="text-sm text-muted-foreground">
                        {formatDate(quote.createdAt, i18n.language, { dateStyle: "short" })}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {branch && (
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{t("externalJobOrders.detail.branch")}</p>
                      <p className="text-sm font-medium">{branch.nameEn ?? branch.nameAr ?? `ID ${branch.id}`}</p>
                      {branch.address && <p className="text-xs text-muted-foreground">{branch.address}</p>}
                    </div>
                  </div>
                )}
                {org && (
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-purple-50 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400 flex-shrink-0">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{t("externalJobOrders.detail.organization")}</p>
                      <p className="text-sm font-medium">{org.name ?? `ID ${org.id}`}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="border-b bg-muted/30 py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <ListOrdered className="h-5 w-5 text-primary" />
                {t("externalJobOrders.detail.timeline")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {loadingTimeline ? (
                <p className="text-sm text-muted-foreground">{t("externalJobOrders.detail.loadingTimeline")}</p>
              ) : errorTimeline ? (
                <p className="text-sm text-destructive">
                  {timelineError instanceof Error ? timelineError.message : t("externalJobOrders.detail.timelineFailed")}
                </p>
              ) : Array.isArray(timeline) && timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("externalJobOrders.detail.noTimeline")}</p>
              ) : (
                <ul className="space-y-3">
                  {(timeline as Record<string, unknown>[]).map((entry, i) => {
                    const dateRaw = entry.createdAt ?? entry.date;
                    const dateStr =
                      dateRaw != null
                        ? formatDate(String(dateRaw), i18n.language, {
                            dateStyle: "medium",
                            timeStyle: "short",
                            hour12: true,
                          })
                        : null;
                    const message = entry.message ?? entry.description;
                    const actor = entry.Actor as { fullName?: string; email?: string } | undefined;
                    const eventType = entry.eventType;
                    return (
                      <li
                        key={(entry.id as number) ?? i}
                        className="flex flex-col gap-1 border-s-2 border-primary/30 ps-3 py-2"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          {dateStr && (
                            <span className="text-muted-foreground text-xs font-medium shrink-0" title={t("externalJobOrders.detail.localTimezone")}>
                              {dateStr}
                            </span>
                          )}
                          {eventType != null && (
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {String(eventType).replace(/_/g, " ")}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium">
                          {message != null ? String(message) : "—"}
                        </p>
                        {actor && (actor.fullName || actor.email) && (
                          <p className="text-xs text-muted-foreground">
                            {actor.fullName ?? actor.email}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="border-b bg-muted/30 py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                {t("externalJobOrders.detail.reports")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {loadingReports ? (
                <p className="text-sm text-muted-foreground">{t("externalJobOrders.detail.loadingReports")}</p>
              ) : errorReports ? (
                <p className="text-sm text-destructive">
                  {reportsError instanceof Error ? reportsError.message : t("externalJobOrders.detail.reportsFailed")}
                </p>
              ) : Array.isArray(reports) && reports.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("externalJobOrders.detail.noReports")}</p>
              ) : (
                <div className="space-y-6">
                  {(reports as MaintenanceReportItem[]).map((r, i) => (
                    <ReportCard key={r.id ?? i} report={r} t={t} locale={i18n.language} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b bg-muted/30 py-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                {t("externalJobOrders.detail.dates")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2 text-sm">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">{t("externalJobOrders.detail.created")}</p>
                <p>
                {jobOrder.createdAt
                  ? formatDate(jobOrder.createdAt, i18n.language, { dateStyle: "medium", timeStyle: "short", hour12: true })
                  : "—"}
              </p>
              </div>
              {jobOrder.updatedAt && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">{t("externalJobOrders.detail.updated")}</p>
                  <p>
                    {formatDate(jobOrder.updatedAt, i18n.language, { dateStyle: "medium", timeStyle: "short", hour12: true })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
