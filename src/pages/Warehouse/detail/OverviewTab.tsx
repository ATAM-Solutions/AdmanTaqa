import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchStock } from "@/api/services/warehouseService";
import { fetchWarehouseManagers, fetchWarehouseStations } from "@/api/services/warehouseAdminService";
import { Loading, LoadError } from "./shared";
import { stationLabel } from "@/lib/warehouseDisplay";

export default function OverviewTab({ warehouseId, isAdmin, scopingOn }: { warehouseId: number; isAdmin: boolean; scopingOn: boolean }) {
  const { t, i18n } = useTranslation("warehouse");
  const stations = useQuery({ queryKey: ["warehouse-stations", warehouseId], queryFn: () => fetchWarehouseStations(warehouseId), retry: false });
  const stock = useQuery({ queryKey: ["warehouse-stock", warehouseId], queryFn: () => fetchStock(warehouseId), retry: false });
  const managers = useQuery({ queryKey: ["warehouse-managers", warehouseId], queryFn: () => fetchWarehouseManagers(warehouseId), enabled: isAdmin, retry: false });
  const low = (stock.data ?? []).filter((i) => i.minQuantity > 0 && i.quantity < i.minQuantity).length;

  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="wd-overview">
      <Card>
        <CardHeader><CardTitle className="text-base">{t("mgmt.overview.serves")}</CardTitle></CardHeader>
        <CardContent className="text-sm">
          {stations.isLoading ? <Loading /> : stations.isError ? <LoadError error={stations.error} onRetry={() => stations.refetch()} /> : (
            stations.data?.companyLevel
              ? <p data-testid="wd-serves-all">{t("mgmt.servesAll")}</p>
              : <ul className="list-disc space-y-1 ps-5">
                  {stations.data?.home ? <li dir="auto">{stationLabel(stations.data.home, i18n.language)} <span className="text-muted-foreground">({t("mgmt.home")})</span></li> : null}
                  {(stations.data?.links ?? []).map((s) => <li key={s.branchId} dir="auto">{stationLabel(s, i18n.language)}</li>)}
                </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">{t("mgmt.overview.stock")}</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {stock.isLoading ? <Loading /> : stock.isError ? <LoadError error={stock.error} onRetry={() => stock.refetch()} /> : (
            <>
              <p>{t("mgmt.overview.items", { count: stock.data?.length ?? 0 })}</p>
              <p className={low > 0 ? "text-destructive" : "text-muted-foreground"}>{t("mgmt.overview.low", { count: low })}</p>
            </>
          )}
        </CardContent>
      </Card>
      <Card className="md:col-span-2">
        <CardHeader><CardTitle className="text-base">{t("mgmt.overview.managers")}</CardTitle></CardHeader>
        <CardContent className="text-sm">
          {!isAdmin ? (
            <p className="text-muted-foreground">{scopingOn ? t("mgmt.overview.assignedToYou") : t("mgmt.overview.assignmentOff")}</p>
          ) : managers.isLoading ? <Loading /> : managers.isError ? <LoadError error={managers.error} onRetry={() => managers.refetch()} /> : (
            (managers.data ?? []).length === 0
              ? <p className="text-muted-foreground" data-testid="wd-no-managers">{t("mgmt.managers.empty")}</p>
              : <p>{(managers.data ?? []).map((m) => m.fullName ?? m.email).join(" · ")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
