import { Badge } from "@/components/ui/badge";
import type { WorkOrderStatus } from "@/types/workOrder";

type Props = {
  status: WorkOrderStatus | string;
};

export default function WorkOrderStatusBadge({ status }: Props) {
  if (status === "CLOSED") {
    return (
      <Badge className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900 text-xs">
        CLOSED
      </Badge>
    );
  }
  if (status === "UNDER_REVIEW") {
    return (
      <Badge className="bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-900 text-xs">
        UNDER REVIEW
      </Badge>
    );
  }
  if (status === "IN_PROGRESS") {
    return (
      <Badge className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900 text-xs">
        IN PROGRESS
      </Badge>
    );
  }
  if (status === "PENDING") {
    return (
      <Badge className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900 text-xs">
        PENDING
      </Badge>
    );
  }
  return <Badge variant="outline">{status}</Badge>;
}
