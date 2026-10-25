import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AssetStatus, MaintenanceType } from "@/types/asset";

const STATUS_STYLES: Record<AssetStatus, string> = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  UNDER_MAINTENANCE: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  INACTIVE: "border-border bg-muted text-muted-foreground",
  DECOMMISSIONED: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
};

export function AssetStatusBadge({ status, className }: { status: AssetStatus; className?: string }) {
  const { t } = useTranslation("assets");
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap font-medium", STATUS_STYLES[status] ?? STATUS_STYLES.INACTIVE, className)} data-testid="asset-status">
      {t(`status.${status}`, { defaultValue: status })}
    </Badge>
  );
}

export function MaintenanceTypeBadge({ type }: { type: MaintenanceType }) {
  const { t } = useTranslation("assets");
  return (
    <Badge variant="secondary" className="whitespace-nowrap font-medium" data-testid="asset-maintenance-type">
      {t(`maintenanceType.${type}`, { defaultValue: type })}
    </Badge>
  );
}
