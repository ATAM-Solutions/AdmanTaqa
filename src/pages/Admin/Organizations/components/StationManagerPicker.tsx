import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetManagerCandidates } from "@/hooks/AdminOrganizations/useAdminStations";
import type { AdminStation } from "@/types/adminOrganization";

const NONE = "__none__";

interface Props {
  organizationId: number | string;
  station: AdminStation;
  value: number | null;
  onChange: (id: number | null) => void;
}

/**
 * Designated-manager picker for an EXISTING station. Candidates come from the same eligibility rule as the
 * company dashboard (active, same company, Station Manager role). Choosing one designates them and gives them
 * access to this station; it never removes the previous manager's access. Loading / failed / empty are
 * separate states, and the stored legacy free-text name is shown read-only and labelled as not linked.
 */
export function StationManagerPicker({ organizationId, station, value, onChange }: Props) {
  const { t } = useTranslation("adminOrganizations");
  const { data: candidates = [], isLoading, isError, isFetching, refetch } = useGetManagerCandidates(organizationId);
  const legacyName = station.managerSource === "LEGACY_TEXT" ? station.managerName : station.legacyManagerName;

  const current = station.manager;
  const hasCurrentOption = current != null && candidates.some((c) => c.id === current.id);

  return (
    <div className="space-y-2">
      {isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("manager.loading")}
        </p>
      ) : isError ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-destructive/50 px-3 py-2 text-sm text-destructive" role="alert">
          <span>{t("manager.loadFailed")}</span>
          <Button type="button" variant="outline" size="sm" disabled={isFetching} onClick={() => refetch()}>
            {t("manager.retry")}
          </Button>
        </div>
      ) : (
        <>
          <Select value={value != null ? String(value) : NONE} onValueChange={(v) => onChange(v === NONE ? null : Number(v))}>
            <SelectTrigger aria-label={t("manager.label")}>
              <SelectValue placeholder={t("manager.none")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t("manager.none")}</SelectItem>
              {!hasCurrentOption && current ? (
                <SelectItem value={String(current.id)}>
                  {current.fullName} ({t("manager.notEligibleNow")})
                </SelectItem>
              ) : null}
              {candidates.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {candidates.length === 0 ? (
            <p className="text-xs text-muted-foreground" role="status">{t("manager.noCandidates")}</p>
          ) : null}
        </>
      )}
      <p className="text-xs text-muted-foreground">{t("manager.accessNote")}</p>
      {legacyName && !current ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {t("manager.legacyNotLinked", { name: legacyName })}
        </p>
      ) : null}
    </div>
  );
}
