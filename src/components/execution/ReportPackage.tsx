import { useTranslation } from "react-i18next";
import { Camera } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/i18n/formatters";
import type { JobReview } from "@/api/services/externalReviewService";
import type { ProviderReportItem } from "@/types/provider";

/** The final report with the job, provider, operator, visits, photos and execution timeline — what a reviewer reads. */
export default function ReportPackage({ review, report }: { review: JobReview; report: ProviderReportItem | undefined }) {
  const { t, i18n } = useTranslation("execution");
  const ar = i18n.language.startsWith("ar");
  const pkg = review.package;
  const name = (o: { name: string | null; nameAr?: string | null } | null) => (ar ? o?.nameAr || o?.name : o?.name || o?.nameAr) ?? "—";
  const dt = (v: string | null | undefined) => (v ? formatDate(v, i18n.language, { dateStyle: "medium", timeStyle: "short" }) : "—");
  const photos = (report?.attachments ?? []).filter((a) => a?.fileUrl);
  return (
    <Card data-testid="report-package">
      <CardHeader><CardTitle className="text-base">{t("package.title")}</CardTitle></CardHeader>
      <CardContent className="space-y-4 text-sm">
        <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          <div><dt className="text-xs text-muted-foreground">{t("package.station")}</dt><dd>{name(pkg.station)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">{t("package.branch")}</dt><dd>{name(pkg.branch)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">{t("package.provider")}</dt><dd>{name(pkg.provider)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">{t("package.operators")}</dt><dd>{pkg.operators.length ? pkg.operators.map((o) => o.name ?? `#${o.id}`).join(", ") : t("package.noOperators")}</dd></div>
          <div><dt className="text-xs text-muted-foreground">{t("package.activated")}</dt><dd>{dt(pkg.activatedAt)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">{t("package.completion")}</dt><dd>{dt(pkg.completionDate)}</dd></div>
        </dl>
        {report ? (
          <div className="space-y-2" data-testid="report-body">
            <div><p className="text-xs font-medium text-muted-foreground">{t("package.findings")}</p><p className="whitespace-pre-wrap">{report.findings}</p></div>
            <div><p className="text-xs font-medium text-muted-foreground">{t("package.actions")}</p><p className="whitespace-pre-wrap">{report.actionsTaken}</p></div>
            {report.recommendations ? <div><p className="text-xs font-medium text-muted-foreground">{t("package.recommendations")}</p><p className="whitespace-pre-wrap">{report.recommendations}</p></div> : null}
            {photos.length > 0 && (
              <div>
                <p className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground"><Camera className="h-3.5 w-3.5" aria-hidden />{t("package.photos")}</p>
                <div className="flex flex-wrap gap-2">
                  {photos.map((a, i) => (
                    <a key={i} href={a.fileUrl} target="_blank" rel="noreferrer" className="block"><img src={a.fileUrl} alt={a.category ?? t("package.photos")} loading="lazy" className="h-20 w-20 rounded border object-cover" /></a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : <p className="text-muted-foreground">{t("package.noReport")}</p>}
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">{t("package.visits")}</p>
          {pkg.visits.length === 0 ? <p className="text-muted-foreground">{t("package.noVisits")}</p> : (
            <ul className="space-y-1">
              {pkg.visits.map((v) => (
                <li key={v.id} className="rounded border px-2 py-1 text-xs">
                  {v.visitDate} · {v.status}{v.checkedInAt ? ` · ${t("package.checkedIn")} ${dt(v.checkedInAt)}` : ""}{v.completedAt ? ` · ${t("package.completed")} ${dt(v.completedAt)}` : ""}
                  {v.completionNote ? <span className="block text-muted-foreground">{v.completionNote}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
        {pkg.timeline.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">{t("package.timeline")}</p>
            <ol className="space-y-1 border-s ps-3">
              {pkg.timeline.map((e) => (
                <li key={e.id} className="text-xs"><span className="text-muted-foreground">{dt(e.at)}</span> · {e.actor?.name ?? "—"} · {e.message}</li>
              ))}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
