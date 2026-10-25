import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardLoadError } from "@/components/DashboardLoadError";
import AssignmentPolicyCard from "@/components/warehouse/AssignmentPolicyCard";
import useGetBranches from "@/hooks/Branches/useGetBranches";
import { fetchWarehouses, type WarehouseApiError } from "@/api/services/warehouseService";
import { createWarehouse } from "@/api/services/warehouseAdminService";
import { getBranchDisplayName } from "@/lib/company";
import { assignmentErrorKey, servedStationIds } from "@/lib/warehouseAssignments";
import { getApiErrorMessage } from "@/lib/utils";

/** Warehouses the caller may use (the server already filters them), with the company's assignment switch. */
export default function WarehouseManagement() {
  const { t, i18n } = useTranslation("warehouse");
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["warehouses"], queryFn: fetchWarehouses, retry: false });
  const branches = useGetBranches();
  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState("");
  const warehouses = list.data?.items ?? [];
  const meta = list.data?.meta;
  const isAdmin = meta?.assignmentScoping.isAdmin === true;
  const scopingOn = meta?.assignmentScoping.enabled === true;
  const branchName = (id: number) => getBranchDisplayName((branches.data ?? []).find((b) => b.id === id), i18n.language) || `#${id}`;
  const status = (list.error as WarehouseApiError | null)?.status ?? null;

  const create = useMutation({
    mutationFn: () => createWarehouse({ name: name.trim(), branchId: branchId ? Number(branchId) : null }),
    onSuccess: async () => {
      toast.success(t("mgmt.created"));
      setName(""); setBranchId("");
      await qc.invalidateQueries({ queryKey: ["warehouses"] });
    },
    onError: (e) => {
      const key = assignmentErrorKey((e as WarehouseApiError).code);
      toast.error(key ? t(key) : getApiErrorMessage(e, t("errors.generic")));
    },
  });

  const emptyText = scopingOn && !isAdmin
    ? t("mgmt.emptyNoneAssigned")
    : meta?.isOrgWide ? t("inventory.noWarehouseCompany") : t("inventory.noWarehouseLimited");

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">{t("mgmt.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("mgmt.subtitle")}</p>
      </div>

      {list.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}</p>
      ) : list.isError ? (
        status === 403
          ? <p className="text-destructive" role="alert" data-testid="wm-no-permission">{t("inventory.noPermission")}</p>
          : <DashboardLoadError error={list.error} fallbackMessage={t("inventory.loadFailed")} onRetry={() => list.refetch()} />
      ) : (
        <>
          <AssignmentPolicyCard isAdmin={isAdmin} />

          <Card>
            <CardHeader><CardTitle className="text-base">{t("mgmt.listTitle")}</CardTitle></CardHeader>
            <CardContent>
              {warehouses.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="wm-empty">{emptyText}</p>
              ) : (
                <ul className="divide-y" data-testid="wm-list">
                  {warehouses.map((w) => {
                    const served = servedStationIds(w.branchId, w.linkedBranchIds);
                    return (
                      <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 py-3" data-testid="wm-row">
                        <div className="min-w-0">
                          <Link to={`/warehouses/${w.id}`} className="font-medium hover:underline" dir="auto">{w.name}</Link>
                          <p className="text-xs text-muted-foreground" dir="auto">
                            {served.length === 0 ? t("mgmt.servesAll") : served.map(branchName).join(" · ")}
                          </p>
                        </div>
                        <Badge variant="outline">{w.branchId == null && w.linkedBranchIds.length === 0 ? t("inventory.companyLevel") : t("mgmt.stationsCount", { count: served.length })}</Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {meta?.canManageWarehouses && (!scopingOn || isAdmin) ? (
            <Card>
              <CardHeader><CardTitle className="text-base">{t("mgmt.createTitle")}</CardTitle></CardHeader>
              <CardContent>
                <form className="grid gap-3 sm:grid-cols-3" data-testid="wm-create" onSubmit={(e) => { e.preventDefault(); if (name.trim()) create.mutate(); }}>
                  <div className="space-y-1"><Label htmlFor="wm-name">{t("mgmt.name")}</Label><Input id="wm-name" dir="auto" value={name} onChange={(e) => setName(e.target.value)} required maxLength={255} /></div>
                  <div className="space-y-1">
                    <Label htmlFor="wm-branch">{t("mgmt.homeStation")}</Label>
                    <select id="wm-branch" className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                      <option value="">{t("mgmt.noHomeStation")}</option>
                      {(branches.data ?? []).map((b) => <option key={b.id} value={b.id}>{getBranchDisplayName(b, i18n.language)}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end"><Button type="submit" size="sm" disabled={create.isPending || !name.trim()}>{t("mgmt.create")}</Button></div>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
