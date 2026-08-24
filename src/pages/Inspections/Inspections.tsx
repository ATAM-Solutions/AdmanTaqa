import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/patterns/PageHeader";
import { AsyncBoundary } from "@/components/patterns/AsyncBoundary";
import InspectionsTableHeader from "./Component/InspectionsTableHeader";
import TableInspections from "./Component/TableInspections";
import CreateInspectionDialog from "./Component/CreateInspectionDialog";
import ViewInspectionDialog from "./Component/ViewInspectionDialog";
import useGetInspections from "@/hooks/Inspections/useGetInspections";
import type { Inspection } from "@/types/inspection";

export default function Inspections() {
  const { t } = useTranslation("inspections");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewing, setViewing] = useState<Inspection | null>(null);

  const { data, isLoading, error } = useGetInspections({ limit: 100 });
  const inspections = useMemo(() => data?.data ?? [], [data]);

  const filteredInspections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return inspections;
    return inspections.filter(
      (ins) =>
        ins.TargetOrganization?.name?.toLowerCase().includes(q) ||
        ins.Inspector?.fullName?.toLowerCase().includes(q) ||
        String(ins.id).includes(q)
    );
  }, [inspections, searchQuery]);

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in slide-in-from-bottom duration-500">
      <PageHeader
        title={t("page.title")}
        description={t("page.subtitle")}
        action={<CreateInspectionDialog />}
      />

      <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md overflow-hidden">
        <InspectionsTableHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          recordCount={filteredInspections.length}
        />
        <AsyncBoundary
          isLoading={isLoading}
          error={error}
          loadingFallback={<div className="py-12 text-center text-muted-foreground">{t("table.loading")}</div>}
        >
          <TableInspections
            inspections={filteredInspections}
            searchQuery={searchQuery}
            onView={setViewing}
          />
        </AsyncBoundary>
      </Card>

      <ViewInspectionDialog
        open={viewing != null}
        onOpenChange={(open) => !open && setViewing(null)}
        inspection={viewing}
      />
    </div>
  );
}
