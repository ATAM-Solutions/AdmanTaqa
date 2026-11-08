import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { GeoIssue } from "@/lib/geoCheckin";

/** Why a GPS check-in failed, in the user's language, with the numbers the server measured and a way to try again. */
export default function GeoIssueAlert({ issue, onRetry, busy = false }: { issue: GeoIssue; onRetry: () => void; busy?: boolean }) {
  const { t, i18n } = useTranslation("execution");
  const fmt = (m?: number) => (m == null ? "" : new Intl.NumberFormat(i18n.language).format(Math.round(m)));
  return (
    <Alert variant="destructive" role="alert" data-testid="geo-issue" data-kind={issue.kind}>
      <AlertDescription className="space-y-2">
        <p>{t(`geo.issue.${issue.kind}`, { distance: fmt(issue.distance), radius: fmt(issue.radius), accuracy: fmt(issue.accuracy) })}</p>
        {issue.accuracy != null && issue.kind !== "LOCATION_ACCURACY_TOO_LOW" ? <p className="text-xs" data-testid="geo-accuracy">{t("geo.accuracyLine", { accuracy: fmt(issue.accuracy) })}</p> : null}
        <Button size="sm" variant="outline" disabled={busy} onClick={onRetry} data-testid="geo-retry">{t("geo.retry")}</Button>
      </AlertDescription>
    </Alert>
  );
}
