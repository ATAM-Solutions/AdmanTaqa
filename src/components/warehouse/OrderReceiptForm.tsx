import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/utils";
import { runOrderAction, type OrderDetail, type OrderLine, type WarehouseApiError } from "@/api/services/warehouseService";

/** Server error codes the receipt step can answer, each with a translation under `warehouse:errors.*`. */
const RECEIPT_ERROR_CODES = [
  "ORDER_NOT_ISSUED", "ORDER_ALREADY_RECEIVED", "NOT_ASSIGNED_TECHNICIAN", "NO_ASSIGNED_TECHNICIAN", "ORDER_NOT_REQUESTER",
  "INVALID_RECEIVED_QUANTITY", "RECEIPT_NOTE_REQUIRED", "BRANCH_ACCESS_DENIED", "INSUFFICIENT_PERMISSIONS",
] as const;

const asInt = (v: string | undefined) => (v === undefined || v === "" ? null : Math.floor(Number(v)));

/**
 * The assigned technician's "Confirm receipt" step (PATCH /warehouse-orders/:id/receive). ONE implementation shared by the
 * warehouse request page and the task page, so both send the same payload and show the same validation and errors.
 * Render it only when the order's `workflow.actions.receive.allowed` is true (the server folds permission AND identity in);
 * the endpoint enforces the same rule again.
 */
export default function OrderReceiptForm({ order, onDone }: { order: OrderDetail; onDone?: () => void | Promise<void> }) {
  const { t } = useTranslation("warehouse");
  const [qty, setQty] = useState<Record<number, string>>({});
  const [note, setNote] = useState("");
  const inFlight = useRef(false);
  const issuedLines = order.items.filter((i) => i.status === "ISSUED");

  const value = (i: OrderLine) => asInt(qty[i.id]) ?? (i.issuedQuantity ?? 0);
  const invalid = (i: OrderLine) => { const q = value(i); return !(q >= 0) || q > (i.issuedQuantity ?? 0); };
  const short = issuedLines.some((i) => value(i) < (i.issuedQuantity ?? 0));

  const run = useMutation({
    mutationFn: async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const received = issuedLines.map((i) => ({ itemId: i.id, quantity: value(i) }));
        await runOrderAction(order.id, { kind: "receive", received: short ? received : undefined, note: note.trim() || undefined });
      } finally { inFlight.current = false; }
    },
    onSuccess: async () => {
      setQty({}); setNote("");
      toast.success(t("receive.success"));
      await onDone?.();
    },
    onError: async (e) => {
      const err = e as WarehouseApiError;
      const known = RECEIPT_ERROR_CODES.find((c) => c === err.code);
      toast.error(known ? t(`errors.${known}`) : getApiErrorMessage(e, t("errors.generic")));
      // a 409/403/404 means the order changed under us (already received, reassigned…): show the real state
      if (err.status === 409 || err.status === 403 || err.status === 404) await onDone?.();
    },
  });
  const busy = run.isPending;

  if (issuedLines.length === 0) return null;
  return (
    <div className="space-y-2 rounded-md border p-3" data-testid="receive-panel">
      <p className="text-sm font-medium">{t("receive.title")}</p>
      <p className="text-xs text-muted-foreground">{t("receive.hint")}</p>
      {issuedLines.map((i) => (
        <div key={i.id} className="flex flex-wrap items-center gap-2" data-testid="receive-row">
          <span className="min-w-0 flex-1 text-sm" dir="auto">{i.partName} <span className="text-xs text-muted-foreground">({t("receive.issued", { count: i.issuedQuantity ?? 0 })})</span></span>
          <Input className="w-24" type="number" min={0} max={i.issuedQuantity ?? 0} aria-label={t("items.received")} value={qty[i.id] ?? String(i.issuedQuantity ?? 0)} onChange={(e) => setQty((p) => ({ ...p, [i.id]: e.target.value }))} data-testid="receive-qty" />
          {invalid(i) ? <span className="text-xs text-destructive" role="alert">{t("receive.range", { max: i.issuedQuantity ?? 0 })}</span> : null}
        </div>
      ))}
      {short ? (
        <div className="space-y-1" data-testid="receive-note-box">
          <Label htmlFor={`receive-note-${order.id}`} className="text-xs">{t("receive.noteRequired")}</Label>
          <Textarea id={`receive-note-${order.id}`} dir="auto" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      ) : null}
      <Button size="sm" disabled={busy || issuedLines.some(invalid) || (short && !note.trim())} data-testid="action-receive" onClick={() => run.mutate()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("actions.receive")}
      </Button>
    </div>
  );
}
