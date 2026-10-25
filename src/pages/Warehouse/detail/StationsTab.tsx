import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import useGetBranches from "@/hooks/Branches/useGetBranches";
import { fetchWarehouseStations, linkWarehouseStation, unlinkWarehouseStation } from "@/api/services/warehouseAdminService";
import type { WarehouseApiError } from "@/api/services/warehouseService";
import { getBranchDisplayName } from "@/lib/company";
import { assignmentErrorKey } from "@/lib/warehouseAssignments";
import { Loading, LoadError } from "./shared";
import { stationLabel } from "@/lib/warehouseDisplay";

export default function StationsTab({ warehouseId, isAdmin }: { warehouseId: number; isAdmin: boolean }) {
  const { t, i18n } = useTranslation("warehouse");
  const qc = useQueryClient();
  const [pick, setPick] = useState("");
  const stations = useQuery({ queryKey: ["warehouse-stations", warehouseId], queryFn: () => fetchWarehouseStations(warehouseId), retry: false });
  const branches = useGetBranches();
  const taken = new Set([...(stations.data?.links ?? []).map((s) => s.branchId), ...(stations.data?.home ? [stations.data.home.branchId] : [])]);
  const candidates = (branches.data ?? []).filter((b) => !taken.has(b.id));

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["warehouse-stations", warehouseId] });
    await qc.invalidateQueries({ queryKey: ["warehouses"] });
  };
  const onError = (e: unknown) => {
    const err = e as WarehouseApiError;
    const key = assignmentErrorKey(err.code);
    toast.error(key ? t(key) : err.message || t("errors.generic"));
  };
  const link = useMutation({ mutationFn: () => linkWarehouseStation(warehouseId, Number(pick)), onSuccess: async () => { toast.success(t("mgmt.stations.linked")); setPick(""); await refresh(); }, onError });
  const unlink = useMutation({ mutationFn: (branchId: number) => unlinkWarehouseStation(warehouseId, branchId), onSuccess: async () => { toast.success(t("mgmt.stations.unlinked")); await refresh(); }, onError });

  return (
    <div className="space-y-4" data-testid="wd-stations">
      <p className="text-sm text-muted-foreground">{t("mgmt.stations.hint")}</p>
      {stations.isLoading ? <Loading /> : stations.isError ? <LoadError error={stations.error} onRetry={() => stations.refetch()} /> : (
        <>
          {stations.data?.companyLevel ? <p className="text-sm" data-testid="wd-stations-all">{t("mgmt.servesAll")}</p> : null}
          <ul className="divide-y">
            {stations.data?.home ? (
              <li className="flex items-center justify-between py-3" data-testid="wd-station-home"><span dir="auto">{stationLabel(stations.data.home, i18n.language)}</span><span className="text-xs text-muted-foreground">{t("mgmt.home")}</span></li>
            ) : null}
            {stations.data?.links.map((s) => (
              <li key={s.branchId} className="flex items-center justify-between gap-2 py-3" data-testid="wd-station-link">
                <span dir="auto">{stationLabel(s, i18n.language)}</span>
                {isAdmin ? <Button size="sm" variant="outline" disabled={unlink.isPending} onClick={() => unlink.mutate(s.branchId)} data-testid="wd-station-unlink">{t("mgmt.stations.unlink")}</Button> : null}
              </li>
            ))}
          </ul>
        </>
      )}
      {isAdmin ? (
        <form className="flex flex-wrap items-end gap-2 rounded-md border p-3" onSubmit={(e) => { e.preventDefault(); if (pick) link.mutate(); }} data-testid="wd-station-form">
          <div className="min-w-[220px] flex-1 space-y-1">
            <label htmlFor="wd-station-pick" className="text-sm font-medium">{t("mgmt.stations.add")}</label>
            <select id="wd-station-pick" className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={pick} onChange={(e) => setPick(e.target.value)} disabled={branches.isLoading}>
              <option value="">{t("mgmt.stations.choose")}</option>
              {candidates.map((b) => <option key={b.id} value={b.id}>{getBranchDisplayName(b, i18n.language)}</option>)}
            </select>
          </div>
          <Button type="submit" size="sm" disabled={!pick || link.isPending} data-testid="wd-station-add">{t("mgmt.stations.link")}</Button>
        </form>
      ) : <p className="text-xs text-muted-foreground">{t("mgmt.policy.adminOnly")}</p>}
    </div>
  );
}
