import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  to?: string;
  context?: ReactNode;
  isLoading?: boolean;
  accent?: "default" | "warning" | "critical";
}

const ACCENT_CLASSES: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  default: "bg-primary/10 text-primary",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  critical: "bg-destructive/10 text-destructive",
};

export function KpiCard({ label, value, icon, to, context, isLoading, accent = "default" }: KpiCardProps) {
  const body = (
    <Card className={cn("h-full transition-shadow", to ? "hover:shadow-md cursor-pointer" : "")}>
      <CardContent className="p-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-16 mt-1" />
          ) : (
            <p className="text-2xl font-bold tracking-tight mt-1">{value}</p>
          )}
          {context ? <div className="mt-1 text-xs text-muted-foreground">{context}</div> : null}
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", ACCENT_CLASSES[accent])}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );

  if (to) {
    return (
      <Link to={to} className="block h-full">
        {body}
      </Link>
    );
  }
  return body;
}
