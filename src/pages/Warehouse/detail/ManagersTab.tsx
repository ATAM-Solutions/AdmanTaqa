import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import useGetUsers from "@/hooks/Users/useGetUsers";
import { assignWarehouseManager, fetchWarehouseManagers, removeWarehouseManager } from "@/api/services/warehouseAdminService";
import type { WarehouseApiError } from "@/api/services/warehouseService";
import { assignmentErrorKey } from "@/lib/warehouseAssignments";
import { Loading, LoadError } from "./shared";
import { fmtDate } from "@/lib/warehouseDisplay";

/** Company administrator only. An assignment never grants a permission: the person still needs a warehouse Job Title. */
export default function ManagersTab({ warehouseId }: { warehouseId: number }) {
  const { t, i18n } = useTranslation("warehouse");
  const qc = useQueryClient();
  const [pick, setPick] = useState("");
  const managers = useQuery({ queryKey: ["warehouse-managers", warehouseId], queryFn: () => fetchWarehouseManagers(warehouseId), retry: false });
  const users = useGetUsers();
  const assignedIds = new Set((managers.data ?? []).map((m) => m.userId));
  const candidates = (users.data?.data ?? []).filter((u) => u.isActive !== false && !assignedIds.has(u.id));

  const onError = (e: unknown) => {
    const err = e as WarehouseApiError;
    const key = assignmentErrorKey(err.code);
    toast.error(key ? t(key) : err.message || t("errors.generic"));
  };
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["warehouse-managers", warehouseId] });
    await qc.invalidateQueries({ queryKey: ["warehouse-assignment-policy"] });
  };
  const assign = useMutation({
    mutationFn: () => assignWarehouseManager(warehouseId, Number(pick)),
    onSuccess: async () => { toast.success(t("mgmt.managers.assigned")); setPick(""); await refresh(); },
    onError,
  });
  const remove = useMutation({
    mutationFn: (userId: number) => removeWarehouseManager(warehouseId, userId),
    onSuccess: async () => { toast.success(t("mgmt.managers.removed")); await refresh(); },
    onError,
  });

  return (
    <div className="space-y-4" data-testid="wd-managers">
      <p className="text-sm text-muted-foreground">{t("mgmt.managers.hint")}</p>
      {managers.isLoading ? <Loading /> : managers.isError ? <LoadError error={managers.error} onRetry={() => managers.refetch()} /> : (managers.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="wd-managers-empty">{t("mgmt.managers.empty")}</p>
      ) : (
        <ul className="divide-y">
          {managers.data?.map((m) => (
            <li key={m.userId} className="flex flex-wrap items-center justify-between gap-2 py-3" data-testid="wd-manager-row">
              <div className="min-w-0">
                <p className="font-medium" dir="auto">{m.fullName ?? m.email}</p>
                <p className="text-xs text-muted-foreground" dir="ltr">{m.email} · {fmtDate(m.assignedAt, i18n.language)}{m.isActive ? "" : ` · ${t("mgmt.managers.inactive")}`}</p>
              </div>
              <Button size="sm" variant="outline" disabled={remove.isPending} onClick={() => remove.mutate(m.userId)} data-testid="wd-manager-remove">{t("mgmt.managers.remove")}</Button>
            </li>
          ))}
        </ul>
      )}
      <form className="flex flex-wrap items-end gap-2 rounded-md border p-3" onSubmit={(e) => { e.preventDefault(); if (pick) assign.mutate(); }} data-testid="wd-manager-form">
        <div className="min-w-[220px] flex-1 space-y-1">
          <label htmlFor="wd-manager-pick" className="text-sm font-medium">{t("mgmt.managers.add")}</label>
          <select id="wd-manager-pick" className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={pick} onChange={(e) => setPick(e.target.value)} disabled={users.isLoading}>
            <option value="">{users.isLoading ? t("loading") : t("mgmt.managers.choose")}</option>
            {candidates.map((u) => <option key={u.id} value={u.id}>{u.fullName} — {u.email}</option>)}
          </select>
        </div>
        <Button type="submit" size="sm" disabled={!pick || assign.isPending} data-testid="wd-manager-add">{t("mgmt.managers.assign")}</Button>
      </form>
    </div>
  );
}
