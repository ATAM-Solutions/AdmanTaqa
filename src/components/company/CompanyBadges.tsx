import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Organization type chip (Fuel Station / Service Provider / ...). */
export function OrganizationTypeBadge({ type, className }: { type: string; className?: string }) {
  const { t } = useTranslation("adminOrganizations");
  const isFuel = type === "FUEL_STATION";
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        isFuel
          ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
          : "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900 dark:bg-purple-950 dark:text-purple-300",
        className
      )}
    >
      {t(`type.${type}`, { defaultValue: type.replace(/_/g, " ") })}
    </Badge>
  );
}

/** Registration status chip (PENDING / APPROVED / REJECTED). */
export function OrganizationStatusBadge({ status, className }: { status: string; className?: string }) {
  const { t } = useTranslation("adminOrganizations");
  const styles: Record<string, string> = {
    APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
    PENDING: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
    REJECTED: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
  };
  return (
    <Badge variant="outline" className={cn("font-medium", styles[status] ?? "", className)}>
      {t(`status.${status}`, { defaultValue: status })}
    </Badge>
  );
}

/** Active / inactive chip for companies, stations and users. */
export function ActiveBadge({ isActive, className }: { isActive: boolean; className?: string }) {
  const { t } = useTranslation("adminOrganizations");
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        isActive
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
          : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
        className
      )}
    >
      <span className={cn("me-1.5 inline-block h-1.5 w-1.5 rounded-full", isActive ? "bg-emerald-500" : "bg-slate-400")} />
      {isActive ? t("active.active") : t("active.inactive")}
    </Badge>
  );
}

/** Station status chip (APPROVED / SUSPENDED / PENDING). */
export function StationStatusBadge({ status, className }: { status: string; className?: string }) {
  const { t } = useTranslation("adminOrganizations");
  const styles: Record<string, string> = {
    APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
    PENDING: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
    SUSPENDED: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
  };
  return (
    <Badge variant="outline" className={cn("font-medium", styles[status] ?? "", className)}>
      {t(`stationStatus.${status}`, { defaultValue: status })}
    </Badge>
  );
}
