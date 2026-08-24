import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import useGetOrganization from "@/hooks/Organization/useGetOrganization";
import useGetBranchRequestById from "@/hooks/BranchRequests/useGetBranchRequestById";
import useApproveBranchRequest from "@/hooks/BranchRequests/useApproveBranchRequest";
import useRejectBranchRequest from "@/hooks/BranchRequests/useRejectBranchRequest";
import BranchRequestStatusBadge from "./Component/BranchRequestStatusBadge";
import RejectBranchRequestDialog from "./Component/RejectBranchRequestDialog";
import { AsyncBoundary } from "@/components/patterns/AsyncBoundary";

export default function BranchRequestDetails() {
  const { t } = useTranslation("branchRequests");
  const navigate = useNavigate();
  const { id } = useParams();
  const numericId = id ? Number(id) : null;
  const [rejectOpen, setRejectOpen] = useState(false);

  const { data: orgResponse } = useGetOrganization();

  const organization = orgResponse?.data;
  const isAuthority = organization?.type === "AUTHORITY";

  const { data: request, isLoading, error } = useGetBranchRequestById(numericId);
  const approveMutation = useApproveBranchRequest();
  const rejectMutation = useRejectBranchRequest();

  const canReview =
    request?.status === "PENDING" || request?.status === "UNDER_REVIEW";

  const onApprove = () => {
    if (!request) return;
    approveMutation.mutate(request.id, {
      onSuccess: () => toast.success(t("toasts.approved")),
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : t("toasts.approveFailed")),
    });
  };

  const onReject = (reason?: string) => {
    if (!request) return;
    rejectMutation.mutate(
      { id: request.id, body: { reason } },
      {
        onSuccess: () => {
          toast.success(t("toasts.rejected"));
          setRejectOpen(false);
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : t("toasts.rejectFailed")),
      }
    );
  };

  return (
    <div className="p-4 md:p-8">
      <AsyncBoundary
        isLoading={isLoading}
        error={error ?? (!request ? new Error(t("details.notFound")) : undefined)}
        loadingFallback={<div className="p-8 text-sm text-muted-foreground">{t("details.loading")}</div>}
      >
        {request && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{t("details.title")}</h1>
                <p className="text-muted-foreground">
                  {request.referenceCode || t("details.requestFallback", { id: request.id })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <BranchRequestStatusBadge status={request.status} />
                <Button variant="outline" onClick={() => navigate("/branch-requests")}>
                  {t("details.back")}
                </Button>
              </div>
            </div>

            <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md">
              <CardHeader>
                <CardTitle>{t("details.info")}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{t("details.nameEn")}</p>
                  <p className="font-medium">{request.nameEn || t("details.notAvailable")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("details.nameAr")}</p>
                  <p className="font-medium">{request.nameAr || t("details.notAvailable")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("details.areaId")}</p>
                  <p className="font-medium">{request.areaId ?? t("details.notAvailable")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("details.stationTypeId")}</p>
                  <p className="font-medium">{request.stationTypeId ?? t("details.notAvailable")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("details.licenseNumber")}</p>
                  <p className="font-medium">{request.licenseNumber || t("details.notAvailable")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("details.branchIdAfterApproval")}</p>
                  <p className="font-medium">{request.branchId ?? t("details.notAvailable")}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-muted-foreground">{t("details.address")}</p>
                  <p className="font-medium">{request.address || t("details.notAvailable")}</p>
                </div>
                {request.rejectionReason && (
                  <div className="md:col-span-2">
                    <p className="text-muted-foreground">{t("details.rejectionReason")}</p>
                    <p className="font-medium text-destructive">{request.rejectionReason}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {isAuthority && canReview && (
              <div className="flex gap-2">
                <Button onClick={onApprove} disabled={approveMutation.isPending}>
                  {approveMutation.isPending ? t("details.approving") : t("details.approve")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setRejectOpen(true)}
                  disabled={rejectMutation.isPending}
                >
                  {t("table.reject")}
                </Button>
              </div>
            )}

            <RejectBranchRequestDialog
              open={rejectOpen}
              onOpenChange={setRejectOpen}
              isPending={rejectMutation.isPending}
              onSubmit={onReject}
            />
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
