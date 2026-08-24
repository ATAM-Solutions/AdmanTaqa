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

export type InspectionRow = {
  id: string;
  target: string;
  branch: string;
  type: string;
  inspector: string;
  status: string;
  findings: string;
  date: string;
};

type TableInspectionsProps = {
  inspections: InspectionRow[];
  searchQuery: string;
};

function getStatusBadge(status: string) {
  const variants: Record<string, string> = {
    COMPLETED: "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900",
    IN_PROGRESS: "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900",
    SCHEDULED: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900",
    CANCELLED: "bg-muted text-muted-foreground border-border",
  };
  return (
    <Badge className={`${variants[status] || "bg-muted"} border font-semibold text-[10px] gap-1.5`}>
      <div
        className={`h-1.5 w-1.5 rounded-full ${
          status === "COMPLETED" ? "bg-green-500" : status === "IN_PROGRESS" ? "bg-blue-500" : "bg-muted-foreground"
        }`}
      />
      {status}
    </Badge>
  );
}

export default function TableInspections({ inspections, searchQuery }: TableInspectionsProps) {
  const { t } = useTranslation("inspections");

  return (
    <CardContent className="p-0">
      <Table>
        <TableHeader className="bg-muted/30 hover:bg-muted/30 transition-none">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[140px] font-bold">{t("table.columns.id")}</TableHead>
            <TableHead className="font-bold">{t("table.columns.targetBranch")}</TableHead>
            <TableHead className="font-bold">{t("table.columns.inspector")}</TableHead>
            <TableHead className="font-bold">{t("table.columns.status")}</TableHead>
            <TableHead className="font-bold">{t("table.columns.date")}</TableHead>
            <TableHead className="text-end font-bold px-6">{t("table.columns.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inspections.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                {t("table.noResults", { query: searchQuery })}
              </TableCell>
            </TableRow>
          ) : (
            inspections.map((ins) => (
              <TableRow
                key={ins.id}
                className="hover:bg-muted/20 border-b border-muted/10 last:border-0 transition-colors"
              >
                <TableCell className="font-mono text-[11px] font-bold text-muted-foreground">{ins.id}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-primary/70" />
                      {ins.target}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 ms-5">
                      <MapPin className="h-2.5 w-2.5" />
                      {ins.branch}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-[10px] text-rose-700 dark:text-rose-400 font-bold">
                      {ins.inspector
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <span className="text-xs font-medium">{ins.inspector}</span>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(ins.status)}</TableCell>
                <TableCell className="text-[11px] font-bold text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    {ins.date}
                  </div>
                </TableCell>
                <TableCell className="text-end px-6">
                  <Button variant="ghost" size="sm" className="h-8 gap-2 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950 dark:hover:text-rose-400">
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
