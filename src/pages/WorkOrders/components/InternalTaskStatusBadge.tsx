import { Badge } from "@/components/ui/badge";
import type { InternalTaskStatus } from "@/types/internalTask";

type Props = {
  status: InternalTaskStatus | string;
};

export default function InternalTaskStatusBadge({ status }: Props) {
  const styleMap: Record<string, string> = {
    ASSIGNED: "bg-muted text-muted-foreground border-border",
    IN_PROGRESS: "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900",
    PAUSED: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900",
    WAITING_PARTS: "bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900",
    COMPLETED: "bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-900",
    CLOSED: "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900",
  };

  return (
    <Badge className={`${styleMap[status] ?? "bg-muted"} text-xs`}>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}
