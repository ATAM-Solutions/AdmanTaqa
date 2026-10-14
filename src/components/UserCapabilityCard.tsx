import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/utils";
import { fetchUserCapabilities, setUserCapability } from "@/api/services/warehouseService";

const CODE = "warehouse_items.create";

/** Owner/administrator control: allow ONE person to add inventory items, without editing the role they share. */
export default function UserCapabilityCard({ userId }: { userId: number | string }) {
  const { t } = useTranslation("warehouse");
  const { hasPermission, organization } = useAuth();
  const qc = useQueryClient();
  const allowed = hasPermission("team.assign_roles") && organization?.type === "FUEL_STATION";
  const q = useQuery({ queryKey: ["user-capabilities", userId], queryFn: () => fetchUserCapabilities(userId), enabled: allowed, retry: false });
  const m = useMutation({
    mutationFn: (effect: "GRANT" | "DENY" | "DEFAULT") => setUserCapability(userId, CODE, effect),
    onSuccess: (data) => { qc.setQueryData(["user-capabilities", userId], data); toast.success(t("capability.saved")); },
    onError: (e) => toast.error(getApiErrorMessage(e, t("errors.generic"))),
  });
  if (!allowed) return null;
  const cap = q.data?.find((c) => c.code === CODE);
  const source = cap ? (cap.override === "GRANT" ? "grant" : cap.override === "DENY" ? "deny" : cap.byRole ? "role" : "none") : null;

  return (
    <Card data-testid="capability-card">
      <CardHeader><CardTitle className="text-base">{t("capability.title")}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{t("capability.description")}</p>
        {q.isLoading ? <p className="text-sm text-muted-foreground">{t("loading")}</p> : q.isError ? (
          <p className="text-sm text-destructive" role="alert">{t("capability.loadFailed")}</p>
        ) : cap ? (
          <>
            <p className="text-sm" data-testid="capability-state">
              <span className="font-medium">{cap.effective ? t("capability.enabled") : t("capability.disabled")}</span>
              {" — "}{t(`capability.source.${source}`)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={m.isPending || cap.override === "GRANT"} data-testid="capability-enable" onClick={() => m.mutate("GRANT")}>{t("capability.enable")}</Button>
              <Button size="sm" variant="outline" disabled={m.isPending || cap.override === "DENY"} data-testid="capability-disable" onClick={() => m.mutate("DENY")}>{t("capability.disable")}</Button>
              {cap.override ? <Button size="sm" variant="ghost" disabled={m.isPending} data-testid="capability-reset" onClick={() => m.mutate("DEFAULT")}>{t("capability.reset")}</Button> : null}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
