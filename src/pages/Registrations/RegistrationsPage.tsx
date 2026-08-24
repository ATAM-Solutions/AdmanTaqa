import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import TableOrganization from "@/pages/Authority/Organizations/Component/TableOrganization";
import useGetOrganizations from "@/hooks/Organization/useGetOrganizations";
import { AsyncBoundary } from "@/components/patterns/AsyncBoundary";

export default function RegistrationsPage() {
  const { t } = useTranslation("registrations");
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isLoading, error } = useGetOrganizations({
    status: "APPROVED",
    type: "SERVICE_PROVIDER",
    page: 1,
    limit: 20,
  });

  const filteredOrgs = useMemo(() => {
    const list = (data?.data?.items ?? []).filter(
      (org) => org.status === "APPROVED" && org.type === "SERVICE_PROVIDER"
    );
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (org) =>
        org.name.toLowerCase().includes(q) ||
        String(org.id).toLowerCase().includes(q)
    );
  }, [data?.data?.items, searchQuery]);

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("list.title")}</h1>
        <p className="text-muted-foreground">{t("list.subtitle")}</p>
      </div>

      <AsyncBoundary
        isLoading={isLoading}
        error={error}
        loadingFallback={
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            {t("list.loading")}
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
