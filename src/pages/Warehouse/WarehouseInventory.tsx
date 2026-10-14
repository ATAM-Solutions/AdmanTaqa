import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardLoadError } from "@/components/DashboardLoadError";
import { getApiErrorMessage } from "@/lib/utils";
import { addStockItem, fetchStock, fetchWarehouses, type WarehouseApiError } from "@/api/services/warehouseService";

/**
 * Inventory (parts) — explicit warehouse selection, never "the first one". Distinct states: loading, no permission,
 * failed, "no warehouse visible to you", successful-empty stock, data.
 */
export default function WarehouseInventory() {
  const { t, i18n } = useTranslation("warehouse");
  const qc = useQueryClient();
  const [picked, setPicked] = useState<string>("");
  const [form, setForm] = useState({ name: "", code: "", quantity: "0" });

  const list = useQuery({ queryKey: ["warehouses"], queryFn: fetchWarehouses, retry: false });
  const warehouses = list.data?.items ?? [];
  // A single visible warehouse is unambiguous and is shown selected (and labelled); several require a choice.
  const selectedId = picked ? Number(picked) : warehouses.length === 1 ? warehouses[0].id : null;
  const stock = useQuery({
    queryKey: ["warehouse-stock", selectedId],
    queryFn: () => fetchStock(selectedId as number),
    enabled: selectedId != null,
    retry: false,
  });
  const add = useMutation({
    mutationFn: () => addStockItem(selectedId as number, { name: form.name.trim(), code: form.code.trim() || undefined, quantity: Math.max(0, Math.floor(Number(form.quantity) || 0)) }),
    onSuccess: async () => {
      toast.success(t("inventory.added"));
      setForm({ name: "", code: "", quantity: "0" });
      await qc.invalidateQueries({ queryKey: ["warehouse-stock", selectedId] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("errors.generic"))),
  });
  const stName = (w: (typeof warehouses)[number]) =>
    w.stationName ? (i18n.language.startsWith("ar") ? w.stationName.ar ?? w.stationName.en : w.stationName.en ?? w.stationName.ar) : t("inventory.companyLevel");

  const listStatus = (list.error as WarehouseApiError | null)?.status ?? null;
  const stockStatus = (stock.error as WarehouseApiError | null)?.status ?? null;

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">{t("inventory.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("inventory.subtitle")}</p>
      </div>

      {list.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}</p>
      ) : list.isError ? (
        listStatus === 403 ? (
          <p className="text-destructive" role="alert" data-testid="inv-no-permission">{t("inventory.noPermission")}</p>
        ) : (
          <DashboardLoadError error={list.error} fallbackMessage={t("inventory.loadFailed")} onRetry={() => list.refetch()} />
        )
      ) : warehouses.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="inv-no-warehouse">
          {list.data?.meta.isOrgWide ? t("inventory.noWarehouseCompany") : t("inventory.noWarehouseLimited")}
        </p>
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">{t("inventory.warehouse")}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <select className="w-full rounded-md border bg-background p-2 text-sm" data-testid="inv-warehouse-select" value={selectedId ?? ""} onChange={(e) => setPicked(e.target.value)}>
                {warehouses.length > 1 ? <option value="">{t("inventory.choose")}</option> : null}
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name} — {stName(w)}</option>)}
              </select>
              {!list.data?.meta.isOrgWide ? <p className="text-xs text-muted-foreground" data-testid="inv-limited-note">{t("inventory.limitedNote")}</p> : null}
            </CardContent>
          </Card>

          {selectedId == null ? (
            <p className="text-sm text-muted-foreground" data-testid="inv-choose">{t("inventory.chooseHint")}</p>
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-base">{t("inventory.stock")}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {stock.isLoading ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}</p>
                ) : stock.isError ? (
                  stockStatus === 403 ? (
                    <p className="text-destructive" role="alert" data-testid="inv-stock-forbidden">{t("inventory.stockForbidden")}</p>
                  ) : (
                    <DashboardLoadError error={stock.error} fallbackMessage={t("inventory.loadFailed")} onRetry={() => stock.refetch()} />
                  )
                ) : (stock.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground" data-testid="inv-empty">{t("inventory.empty")}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" data-testid="inv-table">
                      <thead><tr className="text-xs text-muted-foreground"><th className="py-1 text-start">{t("items.part")}</th><th className="text-start">{t("inventory.code")}</th><th className="text-start">{t("items.qty")}</th></tr></thead>
                      <tbody>
                        {(stock.data ?? []).map((i) => (
                          <tr key={i.id} className="border-t"><td className="py-2" dir="auto">{i.name}</td><td dir="ltr">{i.code ?? "—"}</td><td>{i.quantity}{i.unit ? ` ${i.unit}` : ""}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {list.data?.meta.canAddItems ? (
                  <form className="grid gap-3 rounded-md border p-3 sm:grid-cols-4" data-testid="inv-add-form"
                    onSubmit={(e) => { e.preventDefault(); if (form.name.trim()) add.mutate(); }}>
                    <div className="space-y-1 sm:col-span-2"><Label>{t("items.part")}</Label><Input dir="auto" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required /></div>
                    <div className="space-y-1"><Label>{t("inventory.code")}</Label><Input dir="ltr" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>{t("items.qty")}</Label><Input type="number" min={0} value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} /></div>
                    <div className="sm:col-span-4"><Button type="submit" size="sm" disabled={add.isPending || !form.name.trim()} data-testid="inv-add-submit">{t("inventory.addItem")}</Button></div>
                  </form>
                ) : (
                  <p className="text-xs text-muted-foreground" data-testid="inv-cannot-add">{t("inventory.cannotAdd")}</p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
