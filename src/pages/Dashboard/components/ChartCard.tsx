import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";

interface ChartCardProps {
  title: ReactNode;
  description?: ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  className?: string;
  children: ReactNode;
}

export function ChartCard({ title, description, isLoading, isEmpty, className, children }: ChartCardProps) {
  const { t } = useTranslation("dashboard");

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[240px] w-full" />
        ) : isEmpty ? (
          <div className="flex h-[240px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <BarChart3 className="h-8 w-8 opacity-40" />
            <p className="text-sm">{t("charts.empty")}</p>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
