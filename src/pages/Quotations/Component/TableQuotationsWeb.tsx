import { Link } from "react-router-dom";
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
import { Eye } from "lucide-react";
import type { QuotationsWebListItem } from "@/types/quotationsWeb";
import { formatDate, formatNumber } from "@/lib/i18n/formatters";

type TableQuotationsWebProps = {
  items: QuotationsWebListItem[];
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border",
  SUBMITTED: "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900",
  REVISED: "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900",
  WITHDRAWN: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900",
  REJECTED: "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900",
  SELECTED: "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900",
};

function getStatusBadge(status: string) {
  return (
    <Badge className={`${STATUS_STYLES[status] || "bg-muted text-muted-foreground"} border shadow-none font-medium text-[10px]`}>
      {status}
    </Badge>
  );
}

export default function TableQuotationsWeb({ items }: TableQuotationsWebProps) {
  const { t, i18n } = useTranslation("quotations");

  return (
    <CardContent className="p-0">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-bold text-foreground">{t("table.title")}</TableHead>
            <TableHead className="font-bold text-foreground">{t("table.status")}</TableHead>
            <TableHead className="font-bold text-foreground">{t("table.version")}</TableHead>
            <TableHead className="font-bold text-foreground">{t("table.totalCost")}</TableHead>
            <TableHead className="font-bold text-foreground">{t("table.branch")}</TableHead>
            <TableHead className="font-bold text-foreground">{t("table.stationOrg")}</TableHead>
            <TableHead className="font-bold text-foreground">{t("table.created")}</TableHead>
            <TableHead className="font-bold text-foreground">{t("table.attachments")}</TableHead>
            <TableHead className="text-end font-bold text-foreground">{t("table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                {t("table.noOffers")}
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => {
              const branch = item.ExternalRequest?.Branch;
              const org = item.ExternalRequest?.Organization;
              const formData = item.ExternalRequest?.formData as { title?: string } | undefined;
              const title = formData?.title ?? "—";
              const branchName = branch?.nameEn ?? branch?.nameAr ?? "—";
              const stationName = org?.name ?? "—";
              const created = item.createdAt
                ? formatDate(item.createdAt, i18n.language, { dateStyle: "short", timeStyle: "short" })
                : "—";
              return (
                <TableRow
                  key={item.id}
                  className="hover:bg-muted/20 transition-all border-b last:border-0 border-muted/20"
                >
                  <TableCell className="font-medium">
                    {title}
                  </TableCell>
                  <TableCell>
                    {item.status ? getStatusBadge(item.status) : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.version ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm font-medium tabular-nums">
                    {item.totalCost != null ? formatNumber(item.totalCost, i18n.language) : "—"}
                  </TableCell>
                  <TableCell className="text-sm">{branchName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {stationName}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{created}</TableCell>
                  <TableCell className="text-sm">
                    {item.hasAttachments ? (
                      <Badge variant="secondary" className="text-[10px]">{t("table.yes")}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-end">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/quotations/${item.id}`} className="gap-1">
                        <Eye className="h-4 w-4" />
                        {t("table.view")}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </CardContent>
  );
}
