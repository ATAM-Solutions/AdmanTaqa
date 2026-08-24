import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import BranchesTableHeader from "./Component/BranchesTableHeader";
import TableBranches from "./Component/TableBranches";
import { AsyncBoundary } from "@/components/patterns/AsyncBoundary";
import useGetBranches from "@/hooks/Branches/useGetBranches";
import type { BranchApiItem } from "@/hooks/Branches/useGetBranches";

export default function Branches() {
  const { t } = useTranslation("branches");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: branches = [], isLoading, error } = useGetBranches();

  const filteredBranches = useMemo(() => {
    return branches.filter((branch: BranchApiItem) => {
      const name = (branch.nameEn || branch.nameAr || "").toLowerCase();
      const idStr = String(branch.id);
      const areaName = (branch.Area?.name ?? "").toLowerCase();
      const matchesSearch =
        name.includes(searchQuery.toLowerCase()) ||
        idStr.includes(searchQuery) ||
        areaName.includes(searchQuery.toLowerCase());
      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "ACTIVE" && branch.status === "APPROVED" && branch.isActive) ||
        (statusFilter === "INACTIVE" && (!branch.isActive || branch.status !== "APPROVED"));
      return matchesSearch && statusMatch;
    });
  }, [branches, searchQuery, statusFilter]);

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in slide-in-from-bottom duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("list.title")}</h1>
          <p className="text-muted-foreground">{t("list.subtitle")}</p>
        </div>
        <Button asChild className="gap-2 shadow-sm bg-primary hover:bg-primary/90">
          <Link to="/branches/create">
            <Plus className="h-4 w-4" />
            {t("list.addNewBranch")}
          </Link>
        </Button>
      </div>

      <AsyncBoundary
        isLoading={isLoading}
        error={error}
        loadingFallback={
          <div className="rounded-lg border bg-card p-8 text-sm text-muted-foreground">{t("list.loading")}</div>
        }
      >
        <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md">
          <BranchesTableHeader
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
          <TableBranches branches={filteredBranches} />
        </Card>
      </AsyncBoundary>
    </div>
  );
}
