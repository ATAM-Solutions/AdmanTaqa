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
import { MapPin, Eye, CheckCircle2, XCircle, Power } from "lucide-react";
import type { BranchApiItem } from "@/hooks/Branches/useGetBranches";

type TableBranchesProps = {
  branches: BranchApiItem[];
  onToggleActive: (branch: { id: number; name: string; isActive: boolean }) => void;
};

function StatusBadge({ status, isActive, activeLabel }: { status: string; isActive: boolean; activeLabel: string }) {
  if (status === "APPROVED" && isActive) {
    return (
      <Badge className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 gap-1 hover:bg-emerald-50 dark:hover:bg-emerald-950 shadow-sm font-medium">
        <CheckCircle2 className="h-3 w-3" />
        {activeLabel}
      </Badge>
    );
  }
  return (
    <Badge className="bg-muted text-muted-foreground border-border gap-1 hover:bg-muted shadow-sm font-medium">
      <XCircle className="h-3 w-3" />
      {status}
    </Badge>
  );
}

export default function TableBranches({ branches, onToggleActive }: TableBranchesProps) {
  const { t } = useTranslation("branches");
  const navigate = useNavigate();

  return (
    <CardContent className="p-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[80px] font-bold text-foreground">{t("list.table.id")}</TableHead>
              <TableHead className="font-bold text-foreground">{t("list.table.name")}</TableHead>
              <TableHead className="font-bold text-foreground">{t("list.table.location")}</TableHead>
              <TableHead className="font-bold text-foreground">{t("list.table.stationType")}</TableHead>
              <TableHead className="font-bold text-foreground">{t("list.table.fuelTypes")}</TableHead>
              <TableHead className="font-bold text-foreground">{t("list.table.status")}</TableHead>
              <TableHead className="text-end font-bold text-foreground px-6">{t("list.table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {branches.length > 0 ? (
              branches.map((branch) => (
                <TableRow
                  key={branch.id}
                  className="hover:bg-muted/20 transition-all border-b last:border-0 border-muted/20"
                >
                  <TableCell className="font-mono text-xs font-bold text-primary/70">{branch.id}</TableCell>
                  <TableCell className="font-semibold text-sm">
                    {branch.nameEn || branch.nameAr || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm">
                        {branch.Area?.name ?? "—"}
                        {branch.address ? `, ${branch.address}` : ""}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {branch.FuelStationType ? (
                      <span>{branch.FuelStationType.name}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(branch.FuelTypes ?? []).length > 0 ? (
                        (branch.FuelTypes ?? []).map((ft) => (
                          <Badge key={ft.id} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {ft.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={branch.status} isActive={branch.isActive} activeLabel={t("list.active")} />
                  </TableCell>
                  <TableCell className="text-end px-6">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-2 hover:bg-primary/5 hover:text-primary transition-all rounded-md"
                        onClick={() => navigate(`/branches/${branch.id}`)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {t("list.table.viewDetails")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 gap-2 rounded-md ${
                          branch.isActive
                            ? "hover:bg-destructive/5 hover:text-destructive"
                            : "hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950 dark:hover:text-emerald-400"
                        }`}
                        onClick={() =>
                          onToggleActive({
                            id: branch.id,
                            name: branch.nameEn || branch.nameAr || String(branch.id),
                            isActive: branch.isActive,
                          })
                        }
                      >
                        <Power className="h-3.5 w-3.5" />
                        {branch.isActive ? t("list.table.deactivate") : t("list.table.activate")}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2 opacity-40">
                    <MapPin className="h-10 w-10" />
                    <p className="font-medium">{t("list.table.noResults")}</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  );
}
