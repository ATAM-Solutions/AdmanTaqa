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
import { Building2, MapPin, Calendar, Eye } from "lucide-react";
import { formatDate } from "@/lib/i18n/formatters";
import type { Inspection } from "@/types/inspection";

type TableInspectionsProps = {
  inspections: Inspection[];
  searchQuery: string;
  onView: (inspection: Inspection) => void;
};

export default function TableInspections({ inspections, searchQuery, onView }: TableInspectionsProps) {
  const { t, i18n } = useTranslation("inspections");

  return (
    <CardContent className="p-0">
      <Table>
        <TableHeader className="bg-muted/30 hover:bg-muted/30 transition-none">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[100px] font-bold">{t("table.columns.id")}</TableHead>
            <TableHead className="font-bold">{t("table.columns.targetBranch")}</TableHead>
            <TableHead className="font-bold">{t("table.columns.inspector")}</TableHead>
            <TableHead className="font-bold">{t("table.columns.date")}</TableHead>
            <TableHead className="text-end font-bold px-6">{t("table.columns.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inspections.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                {t("table.noResults", { query: searchQuery })}
              </TableCell>
            </TableRow>
          ) : (
            inspections.map((ins) => (
              <TableRow
                key={ins.id}
                className="hover:bg-muted/20 border-b border-muted/10 last:border-0 transition-colors cursor-pointer"
                onClick={() => onView(ins)}
              >
                <TableCell className="font-mono text-[11px] font-bold text-muted-foreground">
                  #{ins.id}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-primary/70" />
                      {ins.TargetOrganization?.name ?? t("table.unknownTarget")}
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {t(`targetType.${ins.targetType}`)}
                      </Badge>
                    </span>
                    {ins.Branch && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 ms-5">
                        <MapPin className="h-2.5 w-2.5" />
                        {ins.Branch.nameEn ?? ins.Branch.nameAr}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-medium">
                    {ins.Inspector?.fullName ?? t("table.unknownInspector")}
                  </span>
                </TableCell>
                <TableCell className="text-[11px] font-bold text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    {formatDate(ins.createdAt, i18n.language)}
                  </div>
                </TableCell>
                <TableCell className="text-end px-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-2 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950 dark:hover:text-rose-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(ins);
                    }}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {t("table.reportAction")}
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
