import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/utils";
import { formatDate } from "@/lib/i18n/formatters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { BranchRequestItem } from "@/types/branchRequest";
import BranchRequestStatusBadge from "./BranchRequestStatusBadge";
import RejectBranchRequestDialog from "./RejectBranchRequestDialog";
import useApproveBranchRequest from "@/hooks/BranchRequests/useApproveBranchRequest";
import useRejectBranchRequest from "@/hooks/BranchRequests/useRejectBranchRequest";

type BranchRequestsTableProps = {
  items: BranchRequestItem[];
  isAuthority: boolean;
};

export default function BranchRequestsTable({
  items,
  isAuthority,
}: BranchRequestsTableProps) {
  const { t, i18n } = useTranslation("branchRequests");
  const navigate = useNavigate();
  const approveMutation = useApproveBranchRequest();
  const rejectMutation = useRejectBranchRequest();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);

  const canReview = (status: string) =>
    status === "PENDING" || status === "UNDER_REVIEW";

  const onApprove = (id: number) => {
    approveMutation.mutate(id, {
      onSuccess: () => toast.success(t("toasts.approved")),
      onError: (err) =>
        toast.error(getApiErrorMessage(err, t("toasts.approveFailed"))),
    });
  };

  const onOpenReject = (id: number) => {
    setRejectTargetId(id);
    setRejectOpen(true);
  };

  const onRejectSubmit = (reason?: string) => {
    if (!rejectTargetId) return;
    rejectMutation.mutate(
      { id: rejectTargetId, body: { reason } },
      {
        onSuccess: () => {
          toast.success(t("toasts.rejected"));
          setRejectOpen(false);
          setRejectTargetId(null);
        },
        onError: (err) =>
          toast.error(getApiErrorMessage(err, t("toasts.rejectFailed"))),
      }
    );
  };

  return (
    <CardContent className="p-0">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="hover:bg-transparent">
            <TableHead>{t("table.referenceCode")}</TableHead>
            <TableHead>{t("table.nameEn")}</TableHead>
            <TableHead>{t("table.status")}</TableHead>
            <TableHead>{t("table.submittedAt")}</TableHead>
            <TableHead>{t("table.branch")}</TableHead>
            <TableHead className="text-end">{t("table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                {t("table.empty")}
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id} className="hover:bg-muted/20 transition-all">
                <TableCell className="font-mono text-xs" dir="ltr">
                  {item.referenceCode || `BR-${item.id}`}
                </TableCell>
                <TableCell>{item.nameEn || "N/A"}</TableCell>
                <TableCell>
                  <BranchRequestStatusBadge status={item.status} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(item.createdAt, i18n.language, { dateStyle: "medium", timeStyle: "short" })}
                </TableCell>
                <TableCell className="font-mono text-xs" dir="ltr">
                  {item.branchId != null ? `#${item.branchId}` : "—"}
                </TableCell>
                <TableCell className="text-end">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/branch-requests/${item.id}`)}
                    >
                      {t("table.view")}
                    </Button>
                    {isAuthority && canReview(item.status) && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => onApprove(item.id)}
                          disabled={approveMutation.isPending}
                        >
                          {t("table.approve")}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onOpenReject(item.id)}
                          disabled={rejectMutation.isPending}
                        >
                          {t("table.reject")}
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <RejectBranchRequestDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        isPending={rejectMutation.isPending}
        onSubmit={onRejectSubmit}
      />
    </CardContent>
  );
}
