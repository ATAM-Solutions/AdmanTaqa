import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/utils";
import {
  getRateLimitInfo,
  rateLimitCooldownRemainingSeconds,
  subscribeRateLimitCooldown,
} from "@/lib/rateLimit";

interface Props {
  error: unknown;
  /** Fallback sentence for non-rate-limit failures (already translated by the caller). */
  fallbackMessage: string;
  onRetry: () => void;
  /** True when data from an earlier successful load is still on screen underneath. */
  hasPreviousData?: boolean;
}

/**
 * Error banner for dashboard-style pages. Rate-limit rejections get a translated message with a live
 * countdown; the retry button stays disabled until the wait is over, so users cannot trigger a retry loop.
 * Because it is a banner (not a replacement for the page), previously loaded data stays visible.
 */
export function DashboardLoadError({ error, fallbackMessage, onRetry, hasPreviousData = false }: Props) {
  const { t } = useTranslation("common");
  const rateLimited = getRateLimitInfo(error) !== null;
  const [remaining, setRemaining] = useState(() => rateLimitCooldownRemainingSeconds());

  useEffect(() => {
    if (!rateLimited) return;
    const tick = () => setRemaining(rateLimitCooldownRemainingSeconds());
    tick();
    const interval = window.setInterval(tick, 1000);
    const unsubscribe = subscribeRateLimitCooldown(tick);
    return () => {
      window.clearInterval(interval);
      unsubscribe();
    };
  }, [rateLimited, error]);

  const waiting = rateLimited && remaining > 0;
  const message = getApiErrorMessage(error, fallbackMessage);

  return (
    <Alert variant="destructive" data-testid="dashboard-load-error">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>
          {message}
          {hasPreviousData ? <span className="block text-xs opacity-80">{t("rateLimited.keptPrevious")}</span> : null}
        </span>
        <Button size="sm" variant="outline" disabled={waiting} onClick={onRetry}>
          {waiting ? t("rateLimited.retryIn", { seconds: remaining }) : t("rateLimited.retry")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
