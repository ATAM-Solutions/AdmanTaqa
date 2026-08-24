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
import type { QuotationItem } from "@/types/quotation";

export type QuotationRow = {
  id: number;
  serviceRequestId: number;
  serviceProviderOrganizationId?: number | null;
  pricing?: QuotationItem["QuotationPricing"];
  status: string;
  submittedAt: string;
  providerName?: string | null;
  branchName?: string | null;
  fuelStationName?: string | null;
  submittedBy?: string | null;
  /** ServiceRequest.status (e.g. PENDING) */
  requestStatus?: string | null;
  /** ServiceRequest.formData */
  priority?: string | null;
  description?: string | null;
  /** From QuotationPricing — amount & currency for Service Provider */
  amount?: string | number | null;
  currency?: string | null;
};

type TableQuotationsProps = {
  quotations: QuotationRow[];
  /** When false (e.g. Authority), Amount column is hidden. Default true. */
  showAmountColumn?: boolean;
};

const STATUS_STYLES: Record<string, string> = {
  SUBMITTED: "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900",
  PENDING: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900",
  REJECTED: "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900",
  DRAFT: "bg-muted text-muted-foreground border-border",
};

function getStatusBadge(status: string) {
  return (
    <Badge className={`${STATUS_STYLES[status] || "bg-muted text-muted-foreground"} border shadow-none font-medium text-[10px]`}>
      {status}
    </Badge>
  );
}

export default function TableQuotations({ quotations, showAmountColumn = true }: TableQuotationsProps) {
  const { t } = useTranslation("quotations");
  const colSpan = showAmountColumn ? 7 : 6;
  return (
    <CardContent className="p-0">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-bold text-foreground">{t("table.priority")}</TableHead>
            <TableHead className="font-bold text-foreground">{t("table.description")}</TableHead>
            {showAmountColumn && (
              <TableHead className="font-bold text-foreground">{t("table.amount")}</TableHead>
            )}
            <TableHead className="font-bold text-foreground">{t("table.provider")}</TableHead>
            <TableHead className="font-bold text-foreground">{t("table.branchStation")}</TableHead>
            <TableHead className="font-bold text-foreground">{t("table.submittedBy")}</TableHead>
            <TableHead className="font-bold text-foreground">{t("table.status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center py-8 text-muted-foreground">
                {t("table.noQuotations")}
              </TableCell>
            </TableRow>
          ) : (
            quotations.map((quo) => (
              <TableRow
                key={quo.id}
                className="hover:bg-muted/20 transition-all border-b last:border-0 border-muted/20"
              >
                <TableCell className="text-sm capitalize">
                  {quo.priority ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={quo.description ?? undefined}>
                  {quo.description ?? "—"}
                </TableCell>
                {showAmountColumn && (
                  <TableCell className="text-sm font-medium">
                    {quo.amount != null && quo.amount !== "" ? String(quo.amount) : "—"}
                  </TableCell>
                )}
                <TableCell className="font-semibold text-sm">
                  {quo.providerName ?? (quo.serviceProviderOrganizationId != null ? t("table.orgFallback", { id: quo.serviceProviderOrganizationId }) : t("table.notAvailable"))}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {quo.branchName ?? "—"}
                  {quo.fuelStationName && (
                    <span className="block text-xs mt-0.5">{quo.fuelStationName}</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {quo.submittedBy ?? "—"}
                </TableCell>
                <TableCell>
                  {quo.requestStatus ? getStatusBadge(quo.requestStatus) : "—"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </CardContent>
  );
}
