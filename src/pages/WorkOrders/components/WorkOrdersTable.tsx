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
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import type { WorkOrderItem } from "@/types/workOrder";
import { formatDate } from "@/lib/i18n/formatters";
import WorkOrderStatusBadge from "./WorkOrderStatusBadge";

type Props = {
  items: WorkOrderItem[];
};

export default function WorkOrdersTable({ items }: Props) {
  const { t, i18n } = useTranslation("workOrders");
  const navigate = useNavigate();

  return (
    <CardContent className="p-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent">
              <TableHead>{t("table.id")}</TableHead>
              <TableHead>{t("table.title")}</TableHead>
              <TableHead>{t("table.priority")}</TableHead>
              <TableHead>{t("table.status")}</TableHead>
              <TableHead>{t("table.branchAsset")}</TableHead>
              <TableHead>{t("table.createdAt")}</TableHead>
              <TableHead className="text-end">{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  {t("table.noResults")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">{order.id}</TableCell>
                  <TableCell className="font-semibold">{order.title}</TableCell>
                  <TableCell>{order.priority}</TableCell>
                  <TableCell>
                    <WorkOrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t("table.branchAssetValue", { branchId: order.branchId ?? "—", assetId: order.assetId ?? "—" })}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(order.createdAt, i18n.language, { dateStyle: "medium" })}
                  </TableCell>
                  <TableCell className="text-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => navigate(`/work-orders/${order.id}`)}
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
      </div>
    </CardContent>
  );
}
