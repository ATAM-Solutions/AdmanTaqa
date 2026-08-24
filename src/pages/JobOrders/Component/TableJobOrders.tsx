import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Eye,
  CheckCircle2,
  PlayCircle,
  PauseCircle,
  Calendar,
  ArrowRightCircle,
} from "lucide-react";

export type JobOrderRow = {
  id: string;
  title: string;
  provider: string;
  branch: string;
  startDate: string;
  endDate: string;
  status: string;
};

type TableJobOrdersProps = {
  orders: JobOrderRow[];
};

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    COMPLETED: "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900",
    IN_PROGRESS: "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900",
    PLANNED: "bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900",
    PENDING: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900",
    CREATED: "bg-muted text-muted-foreground border-border",
  };

  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    COMPLETED: CheckCircle2,
    IN_PROGRESS: PlayCircle,
    PLANNED: Calendar,
    PENDING: PauseCircle,
    CREATED: ArrowRightCircle,
  };

  const StatusIcon = icons[status] || ArrowRightCircle;

  return (
    <Badge
      className={`${styles[status] || "bg-muted text-muted-foreground border-border"} border shadow-none font-medium gap-1 text-[10px]`}
    >
      <StatusIcon className="h-3 w-3" />
      {status.replace("_", " ")}
    </Badge>
  );
}

export default function TableJobOrders({ orders }: TableJobOrdersProps) {
  const { t } = useTranslation("jobOrders");
  const navigate = useNavigate();

  return (
    <CardContent className="p-0">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-bold text-foreground">{t("table.title")}</TableHead>
            <TableHead className="font-bold text-foreground">{t("table.serviceProvider")}</TableHead>
            <TableHead className="font-bold text-foreground">{t("table.dates")}</TableHead>
            <TableHead className="font-bold text-foreground">{t("table.status")}</TableHead>
            <TableHead className="text-end font-bold text-foreground px-6">{t("table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                {t("table.noResults")}
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <TableRow
                key={order.id}
                className="hover:bg-muted/20 transition-all border-b last:border-0 border-muted/20"
              >
                <TableCell className="font-semibold text-sm">{order.title}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{order.provider}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {order.branch}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <PlayCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                      <span dir="ltr">{order.startDate}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                      <span dir="ltr">{order.endDate}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(order.status)}</TableCell>
                <TableCell className="text-end px-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-2 hover:bg-primary/5 hover:text-primary transition-all rounded-md"
                    onClick={() => navigate(`/job-orders/${order.id}`)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {t("table.details")}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </CardContent>
  );
}
