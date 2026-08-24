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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, Eye } from "lucide-react";
import type { OrganizationProfile } from "@/types/organization";
import OrganizationActions from "../../Organizations/Component/OrganizationActions";
import { formatDate } from "@/lib/i18n/formatters";

type FuelStationsTableProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  stations: OrganizationProfile[];
  /** When true, the status filter dropdown is hidden (e.g. on Pending/Rejected-only pages). */
  hideStatusFilter?: boolean;
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation("authority");
  if (status === "APPROVED")
    return (
      <Badge className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900 text-xs">
        {t("organizations.status.approved")}
      </Badge>
    );
  if (status === "PENDING")
    return (
      <Badge variant="secondary" className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900 text-xs">
        {t("organizations.status.pendingReview")}
      </Badge>
    );
  if (status === "REJECTED")
    return (
      <Badge variant="destructive" className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900 text-xs">
        {t("organizations.status.rejected")}
      </Badge>
    );
  return <Badge variant="outline">{status}</Badge>;
}

export default function FuelStationsTable({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  stations,
  hideStatusFilter = false,
}: FuelStationsTableProps) {
  const { t, i18n } = useTranslation("authority");
  const navigate = useNavigate();

  return (
    <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm w-full max-w-full overflow-hidden">
      <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80 min-w-0">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("fuelStations.table.searchPlaceholder")}
              className="ps-10 bg-background/50 border-muted-foreground/20 focus-visible:ring-primary/30"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
            {!hideStatusFilter && (
              <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                <SelectTrigger className="w-[140px] h-9 bg-background/50">
                  <SelectValue placeholder={t("fuelStations.table.statusPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("fuelStations.table.statusAll")}</SelectItem>
                  <SelectItem value="PENDING">{t("organizations.status.pendingReview")}</SelectItem>
                  <SelectItem value="APPROVED">{t("organizations.status.approved")}</SelectItem>
                  <SelectItem value="REJECTED">{t("organizations.status.rejected")}</SelectItem>
                </SelectContent>
              </Select>
            )}
            <div className="text-sm font-medium text-muted-foreground whitespace-nowrap flex items-center gap-2">
              <Filter className="h-4 w-4" />
              {t("fuelStations.table.count", { count: stations.length })}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden">
        <div className="overflow-x-auto overflow-y-visible w-full [-webkit-overflow-scrolling:touch]">
          <Table className="min-w-[640px] w-full">
            <TableHeader className="bg-muted/40 divide-y">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold text-foreground">{t("fuelStations.table.columns.name")}</TableHead>
                <TableHead className="font-bold text-foreground">{t("fuelStations.table.columns.status")}</TableHead>
                <TableHead className="font-bold text-foreground max-w-[200px]">{t("fuelStations.table.columns.rejectionReason")}</TableHead>
                <TableHead className="font-bold text-foreground">{t("fuelStations.table.columns.created")}</TableHead>
                <TableHead className="text-end font-bold text-foreground px-4 sm:px-6">{t("fuelStations.table.columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stations.length > 0 ? (
                stations.map((org) => (
                  <TableRow
                    key={org.id}
                    className="hover:bg-muted/20 transition-colors border-b last:border-0"
                  >
                    <TableCell>
                      <span className="font-bold text-sm">{org.name}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={org.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate" title={org.rejectionReason ?? undefined}>
                      {org.status === "REJECTED" && org.rejectionReason
                        ? org.rejectionReason
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-medium">
                      {formatDate(org.createdAt, i18n.language, { year: "numeric", month: "short", day: "2-digit" })}
                    </TableCell>
                    <TableCell className="text-end px-4 sm:px-6">
                      <div className="flex items-center justify-end gap-2 flex-wrap min-w-0">
                        <OrganizationActions
                          orgId={org.id}
                          orgName={org.name}
                          status={org.status}
                          variant="compact"
                          onSuccess={() => {}}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-2 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all shadow-sm"
                          onClick={() => navigate(`/fuel-stations/${org.id}`)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {t("fuelStations.table.view")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 opacity-50">
                      <Search className="h-8 w-8" />
                      <p className="text-sm">{t("fuelStations.table.empty")}</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
