import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import useApproveOrganization from "@/hooks/Organization/useApproveOrganization";
import RejectModal from "./RejectModal";
import { getApiErrorMessage } from "@/lib/utils";

export type OrganizationActionsProps = {
  orgId: number | string;
  orgName: string;
  status: string;
  /** Called after a successful approve or reject */
  onSuccess?: () => void;
  /** Compact buttons for table rows; larger buttons for detail pages */
  variant?: "compact" | "default";
};

export default function OrganizationActions({
  orgId,
  orgName,
  status,
  onSuccess,
  variant = "default",
}: OrganizationActionsProps) {
  const { t } = useTranslation("authority");
  const approveMutation = useApproveOrganization();
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  if (status !== "PENDING") return null;

  const handleApprove = () => {
    approveMutation.mutate(
      { id: orgId, body: { decision: "APPROVED" } },
      {
        onSuccess: () => {
          toast.success(t("organizations.actions.approved"));
          onSuccess?.();
        },
        onError: (e) => toast.error(getApiErrorMessage(e, t("organizations.actions.approveFailed"))),
      }
    );
  };

  const handleReject = (reason?: string) => {
    approveMutation.mutate(
      { id: orgId, body: { decision: "REJECTED", reason } },
      {
        onSuccess: () => {
          toast.success(t("organizations.actions.rejected"));
          setRejectModalOpen(false);
          onSuccess?.();
        },
        onError: (e) => toast.error(getApiErrorMessage(e, t("organizations.actions.rejectFailed"))),
      }
    );
  };

  const isCompact = variant === "compact";

  return (
    <>
      <Button
        variant={isCompact ? "outline" : "destructive"}
        size={isCompact ? "sm" : "default"}
        className={
          isCompact
            ? "h-8 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
            : "gap-2 shadow-lg"
        }
        onClick={() => setRejectModalOpen(true)}
        disabled={approveMutation.isPending}
      >
        <XCircle className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        {t("organizations.actions.reject")}
      </Button>

      <Button
        size={isCompact ? "sm" : "default"}
        className={
          isCompact
            ? "h-8 gap-1.5 bg-green-600 hover:bg-green-700"
            : "gap-2 shadow-lg bg-green-600 hover:bg-green-700"
        }
        onClick={handleApprove}
        disabled={approveMutation.isPending}
      >
        <CheckCircle2 className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        {t("organizations.actions.approve")}
      </Button>

      <RejectModal
        open={rejectModalOpen}
        onOpenChange={setRejectModalOpen}
        orgName={orgName}
        isPending={approveMutation.isPending}
        onSubmit={handleReject}
      />
    </>
  );
}
