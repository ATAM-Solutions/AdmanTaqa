import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DashboardLoadError } from "@/components/DashboardLoadError";

export function Loading() {
  const { t } = useTranslation("warehouse");
  return <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}</p>;
}

export function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation("warehouse");
  return <DashboardLoadError error={error} fallbackMessage={t("inventory.loadFailed")} onRetry={onRetry} />;
}
