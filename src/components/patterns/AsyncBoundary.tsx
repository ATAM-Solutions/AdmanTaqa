import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Inbox } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/utils";

interface AsyncBoundaryProps {
  isLoading: boolean;
  error?: unknown;
  isEmpty?: boolean;
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode;
  emptyFallback?: ReactNode;
  children: ReactNode;
}

/**
 * Standardizes the hand-rolled loading/error/empty markup duplicated across
 * list and detail pages (see Users.tsx for the pattern this replaces).
 */
export function AsyncBoundary({
  isLoading,
  error,
  isEmpty,
  loadingFallback,
  errorFallback,
  emptyFallback,
  children,
}: AsyncBoundaryProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return <>{loadingFallback ?? <AsyncBoundarySkeleton />}</>;
  }

  if (error) {
    return (
      <>
        {errorFallback ?? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{getApiErrorMessage(error, t("asyncBoundary.error"))}</AlertDescription>
          </Alert>
        )}
      </>
    );
  }

  if (isEmpty) {
    return (
      <>
        {emptyFallback ?? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center text-muted-foreground">
            <Inbox className="h-8 w-8 opacity-50" />
            <p>{t("asyncBoundary.empty")}</p>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}

function AsyncBoundarySkeleton() {
  return (
    <div className="space-y-3 py-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
