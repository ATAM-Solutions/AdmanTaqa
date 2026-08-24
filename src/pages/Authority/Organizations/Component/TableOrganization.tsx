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
import { Search, Filter, Eye } from "lucide-react";
import type { OrganizationProfile } from "@/types/organization";
import OrganizationActions from "./OrganizationActions";
import { formatDate } from "@/lib/i18n/formatters";

export type OrganizationRow = OrganizationProfile;

type TableOrganizationProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  organizations: OrganizationRow[];
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

export default function TableOrganization({
  searchQuery,
  onSearchChange,
  organizations,
}: TableOrganizationProps) {
  const { t, i18n } = useTranslation("authority");
  const navigate = useNavigate();

  return (
    <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm w-full max-w-full overflow-hidden">
      <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96 min-w-0">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("organizations.table.searchPlaceholder")}
              className="ps-10 bg-background/50 border-muted-foreground/20 focus-visible:ring-primary/30"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              <Filter className="h-4 w-4 inline-block me-2" />
              {t("organizations.table.count", { count: organizations.length })}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden">
        <div className="overflow-x-auto overflow-y-visible w-full [-webkit-overflow-scrolling:touch]">
          <Table className="min-w-[640px] w-full">
            <TableHeader className="bg-muted/40 divide-y">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold text-foreground">{t("organizations.table.columns.organization")}</TableHead>
                <TableHead className="font-bold text-foreground">{t("organizations.table.columns.type")}</TableHead>
                <TableHead className="font-bold text-foreground">{t("organizations.table.columns.status")}</TableHead>
                <TableHead className="font-bold text-foreground">{t("organizations.table.columns.createdAt")}</TableHead>
                <TableHead className="text-end font-bold text-foreground px-4 sm:px-6">{t("organizations.table.columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.length > 0 ? (
                organizations.map((org) => (
                  <TableRow key={org.id} className="hover:bg-muted/20 transition-colors border-b last:border-0">
                    <TableCell>
                      <span className="font-bold text-sm">{org.name}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal border-primary/20 bg-primary/5 text-primary/80">
                        {org.type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={org.status} />
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
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-2 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all shadow-sm"
                          onClick={() => navigate(`/organizations/${org.id}`)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {t("organizations.table.view")}
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
                      <p className="text-sm">{t("organizations.table.empty")}</p>
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
