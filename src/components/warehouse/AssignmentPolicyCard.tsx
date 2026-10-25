import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLoadError } from "@/components/DashboardLoadError";
import { fetchAssignmentPolicy, setAssignmentPolicy } from "@/api/services/warehouseAdminService";
import type { WarehouseApiError } from "@/api/services/warehouseService";
import { activationChange, assignmentErrorKey, needsImpactConfirmation } from "@/lib/warehouseAssignments";

/**
 * Company switch for "managers see only the warehouses they are assigned to". Everyone sees whether it is on; only the
 * company administrator gets the impact preview and the switch. Turning it on needs the exact impact to be confirmed.
 */
export default function AssignmentPolicyCard({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useTranslation("warehouse");
  const qc = useQueryClient();
  const [confirmed, setConfirmed] = useState(false);
  const policy = useQuery({ queryKey: ["warehouse-assignment-policy"], queryFn: fetchAssignmentPolicy, retry: false });
  const change = useMutation({
    mutationFn: async (on: boolean) => {
      const impact = policy.data?.impact;
      if (!on) return setAssignmentPolicy({ enabled: false });
      if (!impact) throw new Error("no impact");
      return setAssignmentPolicy(activationChange(impact, confirmed));
    },
    onSuccess: async (_d, on) => {
      toast.success(t(on ? "mgmt.policy.turnedOn" : "mgmt.policy.turnedOff"));
      setConfirmed(false);
      await qc.invalidateQueries({ queryKey: ["warehouse-assignment-policy"] });
      await qc.invalidateQueries({ queryKey: ["warehouses"] });
    },
    onError: async (e) => {
      const err = e as WarehouseApiError;
      const key = assignmentErrorKey(err.code);
      toast.error(key ? t(key) : err.message || t("errors.generic"));
      await qc.invalidateQueries({ queryKey: ["warehouse-assignment-policy"] });
    },
  });
  const impact = policy.data?.impact ?? null;
  const enabled = policy.data?.enabled === true;

  return (
    <Card data-testid="policy-card">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">{t("mgmt.policy.title")}</CardTitle>
        {policy.isSuccess ? <Badge variant={enabled ? "default" : "secondary"} data-testid="policy-state">{t(enabled ? "mgmt.policy.on" : "mgmt.policy.off")}</Badge> : null}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {policy.isLoading ? (
          <p className="flex items-center gap-2 text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}</p>
        ) : policy.isError ? (
          <DashboardLoadError error={policy.error} fallbackMessage={t("mgmt.policy.loadFailed")} onRetry={() => policy.refetch()} />
        ) : (
          <>
            <p className="text-muted-foreground">{t(enabled ? "mgmt.policy.descOn" : "mgmt.policy.descOff")}</p>
            {isAdmin && impact ? (
              <div className="space-y-3 rounded-md border p-3" data-testid="policy-impact">
                <p className="font-medium">{t("mgmt.policy.impactTitle")}</p>
                <ul className="list-disc space-y-1 ps-5">
                  <li>{t("mgmt.policy.impactWarehouses", { count: impact.warehouses })}</li>
                  <li>{t("mgmt.policy.impactManagers", { count: impact.managers, assigned: impact.managersWithAssignment })}</li>
                  {impact.warehousesWithoutManager.length > 0 ? <li data-testid="policy-uncovered">{t("mgmt.policy.impactNoManager", { count: impact.warehousesWithoutManager.length })}</li> : null}
                  {impact.openOrdersInWarehousesWithoutManager > 0 ? <li>{t("mgmt.policy.impactOpenOrders", { count: impact.openOrdersInWarehousesWithoutManager })}</li> : null}
                </ul>
                {impact.managersWithoutAssignment.length > 0 ? (
                  <div data-testid="policy-unassigned">
                    <p className="font-medium text-destructive">{t("mgmt.policy.willLoseAccess", { count: impact.managersWithoutAssignment.length })}</p>
                    <ul className="ms-5 list-disc">
                      {impact.managersWithoutAssignment.map((m) => <li key={m.userId} dir="auto">{m.fullName ?? m.email ?? `#${m.userId}`}</li>)}
                    </ul>
                  </div>
                ) : null}
                {impact.blockers.includes("NO_WAREHOUSES") ? <p className="text-destructive" role="alert">{t("mgmt.errors.NO_WAREHOUSES")}</p> : null}
                {impact.blockers.includes("NO_MANAGERS_ASSIGNED") ? <p className="text-destructive" role="alert">{t("mgmt.errors.NO_MANAGERS_ASSIGNED")}</p> : null}
                {!enabled && impact.canActivate && needsImpactConfirmation(impact) ? (
                  <label className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} data-testid="policy-confirm" />
                    <span>{t("mgmt.policy.confirm", { count: impact.managersWithoutAssignment.length })}</span>
                  </label>
                ) : null}
              </div>
            ) : null}
            {isAdmin ? (
              enabled ? (
                <Button variant="outline" size="sm" disabled={change.isPending} onClick={() => change.mutate(false)} data-testid="policy-off">{t("mgmt.policy.turnOff")}</Button>
              ) : (
                <Button
                  size="sm"
                  disabled={change.isPending || !impact?.canActivate || (impact != null && needsImpactConfirmation(impact) && !confirmed)}
                  onClick={() => change.mutate(true)}
                  data-testid="policy-on"
                >
                  {t("mgmt.policy.turnOn")}
                </Button>
              )
            ) : (
              <p className="text-xs text-muted-foreground">{t("mgmt.policy.adminOnly")}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
