import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle } from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/patterns";
import { classifyAssetError, isTerminalAssetError } from "@/lib/assets";
import { assetErrorMessage } from "./assetErrors";

/** Loading / error / empty / ready for one related-records list. Terminal errors (403/404) get no retry button. */
export function RecordsState<T>({ query, emptyText, children }: { query: UseQueryResult<T[], unknown>; emptyText: string; children: (items: T[]) => ReactNode }) {
  const { t } = useTranslation("assets");
  if (query.isLoading) {
    return (
      <div className="space-y-2" aria-busy="true">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }
  if (query.isError || !query.data) {
    const terminal = isTerminalAssetError(classifyAssetError(query.error).kind);
    return (
      <Alert variant="destructive" data-testid="records-error">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>{t("errors.loadFailed")} {assetErrorMessage(t, query.error)}</span>
          {terminal ? null : (
            <Button size="sm" variant="outline" onClick={() => query.refetch()}>{t("list.retry")}</Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }
  if (query.data.length === 0) return <EmptyState title={emptyText} />;
  return <>{children(query.data)}</>;
}

/** Inline failure message of a record form. */
export function FormFailure({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="flex items-start gap-2 text-sm text-destructive" role="alert" data-testid="record-form-error">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

export function FieldMessage({ id, text }: { id: string; text?: string }) {
  if (!text) return null;
  return <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">{text}</p>;
}

/** Card shell shared by every related-records tab. */
export function RecordsCard({ title, description, action, notice, children }: { title: string; description?: string; action?: ReactNode; notice?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {notice}
        {children}
      </CardContent>
    </Card>
  );
}
