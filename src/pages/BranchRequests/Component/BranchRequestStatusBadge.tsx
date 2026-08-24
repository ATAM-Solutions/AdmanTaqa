import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { BranchRequestStatus } from "@/types/branchRequest";

export default function BranchRequestStatusBadge({
  status,
}: {
  status: BranchRequestStatus;
}) {
  const { t } = useTranslation("branchRequests");

  const classes: Record<BranchRequestStatus, string> = {
    PENDING: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900",
    UNDER_REVIEW: "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900",
    APPROVED: "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900",
    REJECTED: "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900",
  };

  return (
    <Badge className={`${classes[status]} border shadow-none font-medium text-[10px]`}>
      {t(`status.${status}`)}
    </Badge>
  );
}
