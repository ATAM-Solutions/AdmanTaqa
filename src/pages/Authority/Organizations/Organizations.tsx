import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import TableOrganization from "./Component/TableOrganization";
import useGetOrganizations from "@/hooks/Organization/useGetOrganizations";
import { AsyncBoundary } from "@/components/patterns/AsyncBoundary";

export default function Organizations() {
  const { t } = useTranslation("authority");
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isLoading, error } = useGetOrganizations({
    page: 1,
    limit: 100,
    type: "SERVICE_PROVIDER",
    status: "PENDING",
  });

  const items = data?.data?.items ?? [];
  const filteredOrgs = useMemo(() => {
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
          <h1 className="text-3xl font-bold tracking-tight">{t("organizations.list.title")}</h1>
          <p className="text-muted-foreground">{t("organizations.list.subtitle")}</p>
        </div>
      </div>

      <AsyncBoundary
        isLoading={isLoading}
        error={error}
        loadingFallback={
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            {t("organizations.list.loading")}
          </div>
        }
      >
        <TableOrganization
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          organizations={filteredOrgs}
        />
      </AsyncBoundary>
    </div>
  );
}
