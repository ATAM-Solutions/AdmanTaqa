import { useTranslation } from "react-i18next";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, CheckCircle, XCircle, Lock } from "lucide-react";
import { toast } from "sonner";
import useInternalWorkOrderById from "@/hooks/Station/useInternalWorkOrderById";
import useReviewInternalWorkOrder from "@/hooks/Station/useReviewInternalWorkOrder";
import useCloseInternalWorkOrder from "@/hooks/Station/useCloseInternalWorkOrder";

export default function InternalWorkOrderDetail() {
  const { t } = useTranslation("station");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading } = useInternalWorkOrderById(id ?? null);
  const reviewMutation = useReviewInternalWorkOrder();
  const closeMutation = useCloseInternalWorkOrder();

  const handleReview = (decision: "APPROVE" | "REJECT") => {
    if (!id) return;
    reviewMutation.mutate(
      { id, body: { decision } },
      {
        onSuccess: () => toast.success(decision === "APPROVE" ? t("internalWorkOrders.detail.toasts.approved") : t("internalWorkOrders.detail.toasts.rejected")),
        onError: (e) => toast.error(e instanceof Error ? e.message : t("internalWorkOrders.detail.toasts.reviewFailed")),
      }
    );
  };

  const handleClose = () => {
    if (!id) return;
    closeMutation.mutate(id, {
      onSuccess: () => toast.success(t("internalWorkOrders.detail.toasts.closed")),
      onError: (e) => toast.error(e instanceof Error ? e.message : t("internalWorkOrders.detail.toasts.closeFailed")),
    });
  };

  const canReview = order?.status === "UNDER_REVIEW";
  const canClose = order?.status !== "CLOSED";

  return (
    <div className="p-4 md:p-8">
      {isLoading || !id ? (
        <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
          {t("loading")}
        </div>
      ) : !order ? (
        <>
          <Button variant="ghost" onClick={() => navigate("/internal-work-orders")} className="mb-4">
            <ChevronLeft className="h-4 w-4 me-2 rtl:rotate-180" /> {t("back")}
          </Button>
          <p className="text-destructive">{t("internalWorkOrders.detail.notFound")}</p>
        </>
      ) : (
    <div className="space-y-6">
      <Button variant="ghost" asChild>
        <Link to="/internal-work-orders" className="gap-2">
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" /> {t("back")}
        </Link>
      </Button>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{order.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t("internalWorkOrders.detail.idLabel", { id: order.id })} <Badge variant="secondary">{order.status}</Badge>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canReview && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleReview("APPROVE")}
                  disabled={reviewMutation.isPending}
                  className="gap-1"
                >
                  <CheckCircle className="h-4 w-4" /> {t("internalWorkOrders.detail.approve")}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleReview("REJECT")}
                  disabled={reviewMutation.isPending}
                  className="gap-1"
                >
                  <XCircle className="h-4 w-4" /> {t("internalWorkOrders.detail.reject")}
                </Button>
              </>
            )}
            {canClose && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleClose}
                disabled={closeMutation.isPending}
                className="gap-1"
              >
                <Lock className="h-4 w-4" /> {t("internalWorkOrders.detail.close")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {order.description && <p className="text-sm">{order.description}</p>}
        </CardContent>
      </Card>
    </div>
      )}
    </div>
  );
}
