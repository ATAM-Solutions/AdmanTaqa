import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/utils";
import { runOrderAction, type OrderDetail, type OrderLine, type WarehouseApiError } from "@/api/services/warehouseService";

interface Props {
  order: OrderDetail;
  /** Called after any successful change so the caller can refetch. */
  onChanged: () => void | Promise<void>;
  /** Show a link to the full warehouse request (used where the panel sits outside that page). */
  showRequestLink?: boolean;
}

const OPEN = ["DELIVERED", "PARTIAL_RETURN"];

/**
 * Spare-parts reconciliation for ONE warehouse request. For every received part:
 *   received = used + returned
 * Only the assigned technician can change anything; everyone else (or a later state) sees it read-only.
 * "All parts used" only FILLS the fields — nothing is sent until the technician confirms in the dialog.
 */
export default function PartsReconciliationPanel({ order, onChanged, showRequestLink }: Props) {
  const { t } = useTranslation("warehouse");
  const { user } = useAuth();
  const [usageQty, setUsageQty] = useState<Record<number, string>>({});
  const [confirming, setConfirming] = useState(false);

  const isAssignedTechnician = order.assignedTechnicianId != null && order.assignedTechnicianId === user?.id;
  const usageOpen = isAssignedTechnician && OPEN.includes(order.status);
  const lines = order.items.filter((i) => (i.issuedQuantity ?? 0) > 0 && i.status !== "NOT_AVAILABLE");
  const hidden = lines.length === 0 || !["DELIVERED", "PARTIAL_RETURN", "RETURN_SUBMITTED", "WAREHOUSE_CONFIRMATION", "RETURNED", "CLOSED"].includes(order.status);

  const received = (i: OrderLine) => i.receivedQuantity ?? i.issuedQuantity ?? 0;
  /** What can still be assigned to "used": received minus what is already returned or waiting at the warehouse. */
  const usageMax = (i: OrderLine) => Math.max(0, received(i) - (i.returnedQuantity ?? 0) - i.pendingReturnQuantity);
  // only an EXPLICIT statement is shown back: the receipt stores "used = received" as a default, which is not a statement
  const usageValue = (i: OrderLine): string => usageQty[i.id] ?? (i.usageConfirmedAt && i.usedQuantity != null ? String(i.usedQuantity) : "");
  const usageInvalid = (i: OrderLine) => {
    const v = usageValue(i);
    if (v === "") return false;
    const n = Number(v);
    return !Number.isInteger(n) || n < 0 || n > usageMax(i);
  };
  const usageChanged = (i: OrderLine) => usageQty[i.id] !== undefined && usageQty[i.id] !== "" && (!i.usageConfirmedAt || Number(usageQty[i.id]) !== i.usedQuantity);
  /** Pieces the technician still has to send back for this line (0 until a usage statement exists). */
  const leftoverOf = (i: OrderLine) => {
    const v = usageValue(i);
    if (v === "" || usageInvalid(i)) return null;
    return Math.max(0, received(i) - Number(v) - (i.returnedQuantity ?? 0) - i.pendingReturnQuantity);
  };
  const lineState = (i: OrderLine): { key: string; tone: "default" | "secondary" | "outline" } => {
    if (!i.usageConfirmedAt && order.status !== "RETURNED" && order.status !== "CLOSED") return { key: "usageNotConfirmed", tone: "outline" };
    const left = Math.max(0, received(i) - (i.usedQuantity ?? received(i)) - (i.returnedQuantity ?? 0) - i.pendingReturnQuantity);
    if (left > 0) return { key: "returnNotRecorded", tone: "outline" };
    if (i.pendingReturnQuantity > 0) return { key: "returnAwaitingWarehouse", tone: "secondary" };
    return { key: "reconciled", tone: "default" };
  };

  const changedLines = lines.filter(usageChanged);
  const anyInvalid = lines.some(usageInvalid);
  const totalLeftover = lines.reduce((n, i) => n + (leftoverOf(i) ?? 0), 0);
  // leftovers of an already-saved statement that were not yet recorded for return
  const savedLeftover = lines.map((i) => ({ i, left: Math.max(0, received(i) - (i.usedQuantity ?? received(i)) - (i.returnedQuantity ?? 0) - i.pendingReturnQuantity) }))
    .filter((x) => x.i.usageConfirmedAt && x.left > 0);
  const pendingReturns = lines.some((i) => i.pendingReturnQuantity > 0);

  const fail = (e: unknown) => {
    const err = e as WarehouseApiError;
    const msg = err.code ? t(`errors.${err.code}`, { defaultValue: "" }) : "";
    toast.error(msg || getApiErrorMessage(e, t("errors.generic")));
  };
  const save = useMutation({
    mutationFn: () => runOrderAction(order.id, { kind: "confirmUsage", lines: changedLines.map((i) => ({ itemId: i.id, usedQuantity: Number(usageQty[i.id]) })) }),
    onSuccess: async () => { setUsageQty({}); setConfirming(false); toast.success(t("usage.saved")); await onChanged(); },
    onError: (e) => { setConfirming(false); fail(e); void onChanged(); },
  });
  // existing warehouse return workflow: record the leftovers, then submit them to the warehouse for physical confirmation
  const sendReturn = useMutation({
    mutationFn: async () => {
      if (savedLeftover.length > 0) await runOrderAction(order.id, { kind: "partialReturn", items: savedLeftover.map((x) => ({ itemId: x.i.id, quantity: x.left })) });
      await runOrderAction(order.id, { kind: "submitReturn" });
    },
    onSuccess: async () => { toast.success(t("usage.returnSent")); await onChanged(); },
    onError: (e) => { fail(e); void onChanged(); },
  });
  const busy = save.isPending || sendReturn.isPending;
  if (hidden) return null;

  return (
    <div className="space-y-3 rounded-md border p-3" data-testid="usage-panel">
      <p className="text-sm font-medium">{t("usage.sectionTitle")}</p>
      <p className="text-xs text-muted-foreground">{usageOpen ? t("usage.hint") : t("usage.readOnlyHint")}</p>
      {lines.map((i) => {
        const st = lineState(i);
        const left = leftoverOf(i);
        return (
          <div key={i.id} className="space-y-1 rounded border p-2" data-testid="usage-row">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="min-w-0 flex-1 text-sm font-medium" dir="auto">{i.partName}</span>
              <Badge variant={st.tone} data-testid="usage-state">{t(`usage.state.${st.key}`)}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span>{t("usage.receivedLabel")}: <b data-testid="usage-received">{received(i)}</b></span>
              <label className="flex items-center gap-2">
                <span>{t("usage.used")}:</span>
                {usageOpen ? (
                  <Input className="w-24" type="number" min={0} max={usageMax(i)} step={1} inputMode="numeric" aria-label={t("usage.used")} placeholder={t("usage.notStated")} value={usageValue(i)} onChange={(e) => setUsageQty((p) => ({ ...p, [i.id]: e.target.value }))} data-testid="usage-qty" />
                ) : (
                  <b>{i.usageConfirmedAt && i.usedQuantity != null ? i.usedQuantity : t("usage.notStated")}</b>
                )}
              </label>
              <span>{t("usage.returnLabel")}: <b data-testid="usage-return">{usageOpen ? (left ?? "—") : (i.returnedQuantity ?? 0) + i.pendingReturnQuantity}</b></span>
              {usageInvalid(i) ? <span className="text-xs text-destructive" role="alert" data-testid="usage-range">{t("usage.range", { max: usageMax(i) })}</span> : null}
            </div>
            {i.pendingReturnQuantity > 0 || (i.returnedQuantity ?? 0) > 0 ? (
              <p className="text-xs text-muted-foreground">{t("usage.returnProgress", { confirmed: i.returnedQuantity ?? 0, pending: i.pendingReturnQuantity })}</p>
            ) : null}
            {i.usageConfirmedAt ? (
              <p className="text-xs text-muted-foreground" data-testid="usage-confirmed">
                {i.usageConfirmedByUserId != null && i.usageConfirmedByUserId === user?.id && user?.fullName
                  ? t("usage.confirmedBy", { name: user.fullName, date: new Date(i.usageConfirmedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) })
                  : t("usage.confirmedAt", { date: new Date(i.usageConfirmedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) })}
              </p>
            ) : null}
          </div>
        );
      })}

      {usageOpen ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" disabled={busy} data-testid="fill-all-used"
            onClick={() => setUsageQty(Object.fromEntries(lines.map((i) => [i.id, String(usageMax(i))])))}>
            {t("usage.allUsed")}
          </Button>
          <Button size="sm" disabled={busy || anyInvalid || changedLines.length === 0} data-testid="save-usage" onClick={() => setConfirming(true)}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("usage.save")}
          </Button>
        </div>
      ) : null}

      {usageOpen && savedLeftover.length > 0 && changedLines.length === 0 ? (
        <div className="space-y-2 rounded-md bg-muted/50 p-2" data-testid="return-leftovers">
          <p className="text-xs">{t("usage.leftoverNotice", { count: savedLeftover.reduce((n, x) => n + x.left, 0) })}</p>
          <Button size="sm" disabled={busy} data-testid="send-return" onClick={() => sendReturn.mutate()}>
            {sendReturn.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("usage.sendReturn")}
          </Button>
        </div>
      ) : null}
      {usageOpen && order.status === "PARTIAL_RETURN" && pendingReturns && savedLeftover.length === 0 ? (
        <div className="space-y-2 rounded-md bg-muted/50 p-2" data-testid="return-submit">
          <p className="text-xs">{t("usage.returnRecordedNotice")}</p>
          <Button size="sm" disabled={busy} data-testid="send-return" onClick={() => sendReturn.mutate()}>
            {sendReturn.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("usage.submitReturn")}
          </Button>
        </div>
      ) : null}
      {(order.status === "RETURN_SUBMITTED" || order.status === "WAREHOUSE_CONFIRMATION") ? (
        <p className="text-xs text-muted-foreground" data-testid="return-awaiting-warehouse">{t("usage.awaitingWarehouse")}</p>
      ) : null}
      {showRequestLink ? (
        <Link className="text-xs underline" to={`/warehouse-requests/${order.id}`} data-testid="open-warehouse-request">{t("usage.openRequest", { id: order.id })}</Link>
      ) : null}

      <Dialog open={confirming} onOpenChange={(o) => { if (!busy) setConfirming(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("usage.confirmTitle")}</DialogTitle>
            <DialogDescription>{t("usage.confirmBody")}</DialogDescription>
          </DialogHeader>
          <ul className="space-y-1 text-sm" data-testid="usage-summary">
            {changedLines.map((i) => (
              <li key={i.id} dir="auto">{i.partName}: {t("usage.summaryLine", { used: Number(usageQty[i.id]), returned: leftoverOf(i) ?? 0 })}</li>
            ))}
          </ul>
          {totalLeftover > 0 ? <p className="text-xs text-muted-foreground">{t("usage.confirmLeftover", { count: totalLeftover })}</p> : null}
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setConfirming(false)}>{t("usage.cancel")}</Button>
            <Button disabled={busy} data-testid="confirm-usage" onClick={() => save.mutate()}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("usage.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
