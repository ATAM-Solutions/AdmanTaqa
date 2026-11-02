import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import useInternalWorkOrderReviewQueue from "@/hooks/Station/useInternalWorkOrderReviewQueue";

export default function InternalWorkOrdersReviewQueue() {
  const { t } = useTranslation("station");
  const { data, isLoading } = useInternalWorkOrderReviewQueue({ page: 1, limit: 50 });
  const items = data?.items ?? [];

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("internalWorkOrders.reviewQueue.title")}</h1>
        <p className="text-muted-foreground">{t("internalWorkOrders.reviewQueue.subtitle")}</p>
      </div>
      <Card className="p-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("internalWorkOrders.reviewQueue.noOrders")}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((wo) => (
              <li key={wo.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3" data-testid="review-queue-item">
                <div className="min-w-0">
                  <span className="font-medium" dir="auto">{wo.title}</span>
                  <span className="ms-2 text-xs text-muted-foreground">{t("internalWorkOrders.reviewQueueOrderId", { id: wo.id })}</span>
                  <div className="mt-1">
                    <Badge variant="secondary" data-testid="review-stage">
                      {t(`internalWorkOrders.reviewStage.${wo.status}`, { defaultValue: t("internalWorkOrders.reviewStage.OTHER") })}
                    </Badge>
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/internal-work-orders/${wo.id}`} data-testid="review-queue-open">{t("internalWorkOrders.reviewQueue.review")}</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
