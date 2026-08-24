import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import useGetFuelStations from "@/hooks/Organization/useGetFuelStations";
import FuelStationsTable from "./Component/FuelStationsTable";
import { AsyncBoundary } from "@/components/patterns/AsyncBoundary";

export default function FuelStations() {
  const { t } = useTranslation("authority");
  const [searchQuery, setSearchQuery] = useState("");
  const [page] = useState(1);
  const [limit] = useState(100);

  const { data, isLoading, error } = useGetFuelStations({
    status: "APPROVED",
    page,
    limit,
  });

  const items = data?.data?.items ?? [];
  const filteredStations = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (org) =>
        org.name.toLowerCase().includes(q) ||
        String(org.id).toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("fuelStations.list.title")}</h1>
          <p className="text-muted-foreground">{t("fuelStations.list.subtitle")}</p>
        </div>
      </div>

      <AsyncBoundary
        isLoading={isLoading}
        error={error}
        loadingFallback={<div className="flex justify-center py-16 text-muted-foreground">{t("fuelStations.list.loading")}</div>}
      >
        <FuelStationsTable
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter="APPROVED"
          onStatusFilterChange={() => {}}
          stations={filteredStations}
          hideStatusFilter
        />
      </AsyncBoundary>
    </div>
  );
}
