import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { fetchMovements } from "@/api/services/warehouseAdminService";
import { Loading, LoadError } from "./shared";
import { fmtDate } from "@/lib/warehouseDisplay";

const TYPES = ["INITIAL", "ISSUE", "RETURN", "ADJUSTMENT"] as const;

export default function MovementsTab({ warehouseId }: { warehouseId: number }) {
  const { t, i18n } = useTranslation("warehouse");
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const q = useQuery({ queryKey: ["warehouse-movements", warehouseId, page, type], queryFn: () => fetchMovements(warehouseId, page, type), retry: false });

  return (
    <div className="space-y-3" data-testid="wd-movements">
      <select className="h-9 rounded-md border bg-background px-2 text-sm" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} aria-label={t("mgmt.movements.type")}>
        <option value="">{t("mgmt.movements.allTypes")}</option>
        {TYPES.map((k) => <option key={k} value={k}>{t(`mgmt.movements.types.${k}`)}</option>)}
      </select>
      {q.isLoading ? <Loading /> : q.isError ? <LoadError error={q.error} onRetry={() => q.refetch()} /> : (q.data?.items ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="wd-movements-empty">{t("mgmt.movements.empty")}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-muted-foreground"><th className="py-1 text-start">{t("mgmt.movements.when")}</th><th className="text-start">{t("mgmt.movements.type")}</th><th className="text-start">{t("items.part")}</th><th className="text-start">{t("mgmt.movements.change")}</th><th className="text-start">{t("mgmt.movements.after")}</th><th className="text-start">{t("mgmt.movements.order")}</th></tr></thead>
              <tbody>
                {q.data?.items.map((m) => (
                  <tr key={m.id} className="border-t" data-testid="wd-movement-row">
                    <td className="py-2" dir="ltr">{fmtDate(m.createdAt, i18n.language)}</td>
                    <td>{t(`mgmt.movements.types.${m.type}`)}</td>
                    <td dir="auto">{m.itemName ?? "—"}{m.itemCode ? <span className="text-xs text-muted-foreground" dir="ltr"> · {m.itemCode}</span> : null}</td>
                    <td dir="ltr" className={m.delta < 0 ? "text-destructive" : ""}>{m.delta > 0 ? `+${m.delta}` : m.delta}</td>
                    <td dir="ltr">{m.quantityBefore} → {m.quantityAfter}</td>
                    <td>{m.warehouseOrderId ? <Link className="hover:underline" to={`/warehouse-requests/${m.warehouseOrderId}`}>#{m.warehouseOrderId}</Link> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t("mgmt.prev")}</Button>
            <span>{page} / {q.data?.totalPages ?? 1}</span>
            <Button size="sm" variant="outline" disabled={page >= (q.data?.totalPages ?? 1)} onClick={() => setPage((p) => p + 1)}>{t("mgmt.next")}</Button>
          </div>
        </>
      )}
    </div>
  );
}
