import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addStockItem, fetchStock, type WarehouseApiError } from "@/api/services/warehouseService";
import { assignmentErrorKey } from "@/lib/warehouseAssignments";
import { getApiErrorMessage } from "@/lib/utils";
import { Loading, LoadError } from "./shared";

export default function StockTab({ warehouseId, canAddItems }: { warehouseId: number; canAddItems: boolean }) {
  const { t } = useTranslation("warehouse");
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", code: "", quantity: "0" });
  const stock = useQuery({ queryKey: ["warehouse-stock", warehouseId], queryFn: () => fetchStock(warehouseId), retry: false });
  const add = useMutation({
    mutationFn: () => addStockItem(warehouseId, { name: form.name.trim(), code: form.code.trim() || undefined, quantity: Math.max(0, Math.floor(Number(form.quantity) || 0)) }),
    onSuccess: async () => {
      toast.success(t("inventory.added"));
      setForm({ name: "", code: "", quantity: "0" });
      await qc.invalidateQueries({ queryKey: ["warehouse-stock", warehouseId] });
    },
    onError: (e) => {
      const key = assignmentErrorKey((e as WarehouseApiError).code);
      toast.error(key ? t(key) : getApiErrorMessage(e, t("errors.generic")));
    },
  });
  const forbidden = ((stock.error as WarehouseApiError | null)?.status ?? null) === 403;

  return (
    <div className="space-y-4" data-testid="wd-stock">
      {stock.isLoading ? <Loading /> : stock.isError ? (
        forbidden ? <p className="text-destructive" role="alert" data-testid="wd-stock-forbidden">{t("inventory.stockForbidden")}</p> : <LoadError error={stock.error} onRetry={() => stock.refetch()} />
      ) : (stock.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="wd-stock-empty">{t("inventory.empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground"><th className="py-1 text-start">{t("items.part")}</th><th className="text-start">{t("inventory.code")}</th><th className="text-start">{t("items.qty")}</th><th className="text-start">{t("mgmt.stock.min")}</th><th /></tr></thead>
            <tbody>
              {(stock.data ?? []).map((i) => {
                const lowStock = i.minQuantity > 0 && i.quantity < i.minQuantity;
                return (
                  <tr key={i.id} className="border-t" data-testid="wd-stock-row">
                    <td className="py-2" dir="auto">{i.name}</td><td dir="ltr">{i.code ?? "—"}</td>
                    <td>{i.quantity}{i.unit ? ` ${i.unit}` : ""}</td><td>{i.minQuantity || "—"}</td>
                    <td>{i.quantity <= 0 ? <Badge variant="destructive">{t("mgmt.stock.out")}</Badge> : lowStock ? <Badge variant="outline">{t("mgmt.stock.low")}</Badge> : null}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {canAddItems ? (
        <form className="grid gap-3 rounded-md border p-3 sm:grid-cols-4" data-testid="wd-add-form" onSubmit={(e) => { e.preventDefault(); if (form.name.trim()) add.mutate(); }}>
          <div className="space-y-1 sm:col-span-2"><Label>{t("items.part")}</Label><Input dir="auto" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required /></div>
          <div className="space-y-1"><Label>{t("inventory.code")}</Label><Input dir="ltr" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} /></div>
          <div className="space-y-1"><Label>{t("items.qty")}</Label><Input type="number" min={0} value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} /></div>
          <div className="sm:col-span-4"><Button type="submit" size="sm" disabled={add.isPending || !form.name.trim()}>{t("inventory.addItem")}</Button></div>
        </form>
      ) : <p className="text-xs text-muted-foreground">{t("inventory.cannotAdd")}</p>}
    </div>
  );
}
