import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardLoadError } from "@/components/DashboardLoadError";
import { fetchWarehouses, type WarehouseApiError } from "@/api/services/warehouseService";
import OverviewTab from "./detail/OverviewTab";
import StockTab from "./detail/StockTab";
import MovementsTab from "./detail/MovementsTab";
import ManagersTab from "./detail/ManagersTab";
import StationsTab from "./detail/StationsTab";
import OrdersTab from "./detail/OrdersTab";

/** One warehouse: overview, items and stock, movements, managers (administrator), linked stations and its orders. */
export default function WarehouseDetail() {
  const { id } = useParams();
  const warehouseId = Number(id);
  const { t } = useTranslation("warehouse");
  const [tab, setTab] = useState("overview");
  // The list is already filtered to what the caller may use: a warehouse missing from it is not theirs (or does not exist).
  const list = useQuery({ queryKey: ["warehouses"], queryFn: fetchWarehouses, retry: false });
  const wh = list.data?.items.find((w) => w.id === warehouseId);
  const isAdmin = list.data?.meta.assignmentScoping.isAdmin === true;
  const status = (list.error as WarehouseApiError | null)?.status ?? null;

  return (
    <div className="space-y-6 p-4 md:p-8">
      <Link to="/warehouses" className="text-sm text-muted-foreground hover:underline">← {t("mgmt.backToList")}</Link>
      {!Number.isInteger(warehouseId) || warehouseId < 1 ? (
        <p className="text-destructive" role="alert" data-testid="wd-not-found">{t("mgmt.notFound")}</p>
      ) : list.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}</p>
      ) : list.isError ? (
        status === 403
          ? <p className="text-destructive" role="alert">{t("inventory.noPermission")}</p>
          : <DashboardLoadError error={list.error} fallbackMessage={t("inventory.loadFailed")} onRetry={() => list.refetch()} />
      ) : !wh ? (
        <p className="text-destructive" role="alert" data-testid="wd-not-found">{t("mgmt.notFoundOrNotYours")}</p>
      ) : (
        <>
          <h1 className="text-2xl font-bold" dir="auto" data-testid="wd-title">{wh.name}</h1>
          <Tabs value={tab} onValueChange={setTab} className="space-y-4">
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 sm:w-auto">
              <TabsTrigger value="overview">{t("mgmt.tabs.overview")}</TabsTrigger>
              <TabsTrigger value="stock">{t("mgmt.tabs.stock")}</TabsTrigger>
              <TabsTrigger value="movements">{t("mgmt.tabs.movements")}</TabsTrigger>
              {isAdmin ? <TabsTrigger value="managers">{t("mgmt.tabs.managers")}</TabsTrigger> : null}
              <TabsTrigger value="stations">{t("mgmt.tabs.stations")}</TabsTrigger>
              <TabsTrigger value="orders">{t("mgmt.tabs.orders")}</TabsTrigger>
            </TabsList>
            <TabsContent value="overview"><OverviewTab warehouseId={warehouseId} isAdmin={isAdmin} scopingOn={list.data?.meta.assignmentScoping.enabled === true} /></TabsContent>
            <TabsContent value="stock"><StockTab warehouseId={warehouseId} canAddItems={list.data?.meta.canAddItems === true} /></TabsContent>
            <TabsContent value="movements"><MovementsTab warehouseId={warehouseId} /></TabsContent>
            {isAdmin ? <TabsContent value="managers"><ManagersTab warehouseId={warehouseId} /></TabsContent> : null}
            <TabsContent value="stations"><StationsTab warehouseId={warehouseId} isAdmin={isAdmin} /></TabsContent>
            <TabsContent value="orders"><OrdersTab warehouseId={warehouseId} /></TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
