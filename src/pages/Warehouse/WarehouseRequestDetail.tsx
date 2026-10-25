import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ChevronLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DashboardLoadError } from "@/components/DashboardLoadError";
import ActivityTimeline from "@/components/ActivityTimeline";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/utils";
import {
  WarehouseApiError,
  fetchOrder,
  fetchStock,
  fetchWarehouses,
  runOrderAction,
  type OrderAction,
  type OrderDetail,
  type OrderLine,
} from "@/api/services/warehouseService";

const KNOWN_CODES = [
  "ITEM_NOT_MAPPED", "ORDER_NOT_MAPPABLE", "REQUESTED_ITEM_INVALID",
  "ORDER_STATUS_TRANSITION_INVALID", "ORDER_NOT_EDITABLE", "ORDER_HAS_NO_ITEMS", "ORDER_NOT_REQUESTER",
  "ITEM_WAREHOUSE_MISMATCH", "ITEM_NOT_FOUND", "INSUFFICIENT_STOCK", "WAREHOUSE_BRANCH_MISMATCH",
  "WAREHOUSE_SELECTION_REQUIRED", "NO_WAREHOUSE_AVAILABLE", "ORDER_WAREHOUSE_NOT_SET", "BRANCH_ACCESS_DENIED", "ORDER_STOCK_ISSUED",
  "ISSUED_EXCEEDS_APPROVED", "NOTHING_TO_ISSUE", "INVALID_QUANTITY", "INVALID_ITEM", "DUPLICATE_ITEM", "ORDER_ALREADY_RECEIVED", "ORDER_NOT_ISSUED",
  "NOT_ASSIGNED_TECHNICIAN", "NO_ASSIGNED_TECHNICIAN", "INVALID_RECEIVED_QUANTITY", "INVALID_USED_QUANTITY", "RECEIPT_NOTE_REQUIRED",
] as const;

type Draft = { partName: string; quantity: string };

export default function WarehouseRequestDetail() {
  const { t, i18n } = useTranslation("warehouse");
  const { id } = useParams<{ id: string }>();
  const { user, hasPermission } = useAuth();
  const qc = useQueryClient();
  const key = ["warehouse-order", id];
  const inFlight = useRef(false);
  const [lines, setLines] = useState<Draft[] | null>(null);
  const [reason, setReason] = useState("");
  const [returnQty, setReturnQty] = useState<Record<number, string>>({});
  const [candidates, setCandidates] = useState<{ id: number; name: string }[] | null>(null);
  const [chosenWarehouse, setChosenWarehouse] = useState("");
  // Approve & Issue quantities and the technician's receipt, keyed by line id; empty = the default (all of it)
  const [issueQty, setIssueQty] = useState<Record<number, string>>({});
  const [issueNote, setIssueNote] = useState("");
  const [receiveQty, setReceiveQty] = useState<Record<number, string>>({});
  const [receiveNote, setReceiveNote] = useState("");
  const [returnReason, setReturnReason] = useState("");

  const q = useQuery<OrderDetail, WarehouseApiError>({
    queryKey: key, queryFn: () => fetchOrder(id as string), enabled: !!id, retry: false, refetchOnWindowFocus: false,
  });
  const order = q.data;
  const canListWarehouses = hasPermission("warehouse.read");
  const warehouses = useQuery({ queryKey: ["warehouses"], queryFn: fetchWarehouses, enabled: canListWarehouses && !!order, retry: false });
  const unmapped = order?.workflow?.unmappedItemIds ?? [];
  const catalogue = useQuery({
    queryKey: ["warehouse-stock", order?.warehouse?.id],
    queryFn: () => fetchStock(order!.warehouse!.id),
    enabled: unmapped.length > 0 && !!order?.warehouse && canListWarehouses,
    retry: false,
  });
  const [mapChoice, setMapChoice] = useState<Record<number, string>>({});

  const run = useMutation({
    mutationFn: async (a: OrderAction) => {
      if (inFlight.current) return;
      inFlight.current = true;
      try { await runOrderAction(id as string, a); } finally { inFlight.current = false; }
    },
    onSuccess: async () => {
      setLines(null); setReason(""); setReturnQty({}); setCandidates(null); setChosenWarehouse("");
      setIssueQty({}); setIssueNote(""); setReceiveQty({}); setReceiveNote(""); setReturnReason("");
      await qc.invalidateQueries({ queryKey: key });
      await qc.invalidateQueries({ queryKey: ["warehouse-requests"] });
    },
    onError: (e) => {
      const err = e as WarehouseApiError;
      if (err.code === "WAREHOUSE_SELECTION_REQUIRED") {
        const c = (err.details?.candidates as { id: number; name: string }[] | undefined) ?? [];
        setCandidates(c);
        toast.error(t("errors.WAREHOUSE_SELECTION_REQUIRED"));
        return;
      }
      const known = KNOWN_CODES.find((c) => c === err.code);
      toast.error(known ? t(`errors.${known}`) : getApiErrorMessage(e, t("errors.generic")));
      if (err.status === 409 || err.status === 403 || err.status === 404) void qc.invalidateQueries({ queryKey: key });
    },
  });
  const busy = run.isPending;

  if (!id) return null;
  const status = q.error?.status ?? null;
  const wf = order?.workflow ?? null;
  const act = (k: string) => wf?.actions?.[k];
  const stationName = order?.station ? (i18n.language.startsWith("ar") ? order.station.ar ?? order.station.en : order.station.en ?? order.station.ar) : null;
  const isRequester = !!order && order.requestedByUserId === user?.id;
  const showStock = !!order && order.items.some((i) => i.availableQuantity != null);
  const fmt = (d: string) => new Date(d).toLocaleString(i18n.language, { dateStyle: "medium", timeStyle: "short" });
  const asInt = (v: string | undefined) => (v === undefined || v === "" ? null : Math.floor(Number(v)));
  /** Lines the warehouse manager will approve and issue in one step (REQUESTED in the new flow, APPROVED in legacy ones). */
  const issuableLines = order?.items.filter((i) => i.status === "REQUESTED" || i.status === "APPROVED") ?? [];
  const maxIssue = (i: OrderLine) => i.approvedQuantity ?? i.quantity;
  const issueValue = (i: OrderLine) => asInt(issueQty[i.id]) ?? maxIssue(i);
  const issueError = (i: OrderLine): "range" | "stock" | null => {
    const q = issueValue(i);
    if (!(q >= 0) || q > maxIssue(i)) return "range";
    if (i.availableQuantity != null && q > i.availableQuantity) return "stock";
    return null;
  };
  const issuedLines = order?.items.filter((i) => i.status === "ISSUED") ?? [];
  const receiveValue = (i: OrderLine) => asInt(receiveQty[i.id]) ?? (i.issuedQuantity ?? 0);
  const receiveInvalid = (i: OrderLine) => { const q = receiveValue(i); return !(q >= 0) || q > (i.issuedQuantity ?? 0); };
  const receiveShort = issuedLines.some((i) => receiveValue(i) < (i.issuedQuantity ?? 0));
  /** What can still be proposed for return: issued − used − already returned − proposed and waiting. */
  const returnableOf = (i: OrderLine) => Math.max(0, (i.issuedQuantity ?? 0) - (i.usedQuantity ?? i.issuedQuantity ?? 0) - (i.returnedQuantity ?? 0) - i.pendingReturnQuantity);

  const reasonText = (r: string | null | undefined, actor: string | undefined) => {
    if (!r) return "";
    if (r === "WRONG_STATE" && actor) return t("reasons.WRONG_STATE", { actor: t(`actors.${actor}`) });
    return t(`reasons.${r}`, { defaultValue: r });
  };

  /** One row per available/unavailable action the caller could ever do — unavailable ones say why. */
  const Row = ({ k, label, onClick, destructive = false }: { k: string; label: string; onClick: () => void; destructive?: boolean }) => {
    const a = act(k);
    if (!a || a.reason === "MISSING_PERMISSION" || a.reason === "NOT_REQUESTER" && !isRequester) return null;
    return (
      <div className="flex flex-wrap items-center gap-3" data-testid={`row-${k}`}>
        <Button size="sm" variant={destructive ? "destructive" : "default"} disabled={!a.allowed || busy} onClick={onClick} data-testid={`action-${k}`}>
          {busy && a.allowed ? <Loader2 className="h-4 w-4 animate-spin" /> : label}
        </Button>
        {!a.allowed ? <span className="text-xs text-muted-foreground" data-testid={`why-${k}`}>{reasonText(a.reason, a.actor)}</span> : null}
      </div>
    );
  };

  const editing = lines !== null;
  const draftLines: Draft[] = lines ?? (order?.items.map((i) => ({ partName: i.partName, quantity: String(i.quantity) })) ?? []);

  return (
    <div className="space-y-6 p-4 md:p-8">
      <Button variant="ghost" asChild>
        <Link to="/warehouse-requests" className="gap-2"><ChevronLeft className="h-4 w-4 rtl:rotate-180" /> {t("back")}</Link>
      </Button>

      {q.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}</p>
      ) : q.isError && !order ? (
        status === 403 || status === 404 ? (
          <p className="text-destructive" role="alert" data-testid="order-no-access">{status === 404 ? t("notFound") : t("noAccess")}</p>
        ) : (
          <DashboardLoadError error={q.error} fallbackMessage={t("loadFailed")} onRetry={() => q.refetch()} />
        )
      ) : order ? (
        <>
          {q.isError ? <DashboardLoadError error={q.error} fallbackMessage={t("loadFailed")} onRetry={() => q.refetch()} hasPreviousData /> : null}
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
              <CardTitle className="text-xl">{t("request", { id: order.id })}</CardTitle>
              <Badge data-testid="order-status" variant="secondary">{wf?.phase ? t(`phase.${wf.phase}`) : t(`status.${order.status}`, { defaultValue: order.status })}</Badge>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">{t("fields.station")}</p><p dir="auto">{stationName ?? "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">{t("fields.warehouse")}</p><p dir="auto" data-testid="order-warehouse">{order.warehouse?.name ?? t("fields.notChosen")}</p></div>
              <div><p className="text-xs text-muted-foreground">{t("fields.requestedBy")}</p><p dir="auto">{order.requestedBy ?? "—"}</p></div>
              {order.issuedAt ? <div data-testid="order-issued"><p className="text-xs text-muted-foreground">{t("fields.issued")}</p><p dir="auto">{fmt(order.issuedAt)}{order.issuedBy ? ` · ${order.issuedBy}` : ""}</p></div> : null}
              {order.receivedAt ? <div data-testid="order-received"><p className="text-xs text-muted-foreground">{t("fields.received")}</p><p dir="auto">{fmt(order.receivedAt)}{order.receivedBy ? ` · ${order.receivedBy}` : ""}</p></div> : null}
              {order.notes ? <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">{t("fields.notes")}</p><p dir="auto">{order.notes}</p></div> : null}
              {order.rejectionReason ? <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">{t("fields.rejectionReason")}</p><p dir="auto">{order.rejectionReason}</p></div> : null}
            </CardContent>
          </Card>

          {wf && !wf.terminal && wf.nextStep ? (
            <Card className="border-primary/40">
              <CardContent className="py-4 text-sm" data-testid="next-step">
                <span className="font-medium">{t("nextStep.title")}: </span>
                {t(`actors.${wf.nextStep.actor}`)} — {t(`actions.${wf.nextStep.action}`)}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader><CardTitle className="text-base">{t("items.title")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {!editing && order.items.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="items-empty">
                  {order.status === "DRAFT" ? t("items.emptyDraft") : t("items.empty")}
                </p>
              ) : null}
              {!editing && order.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="items-table">
                    <thead><tr className="text-start text-xs text-muted-foreground"><th className="py-1 text-start">{t("items.part")}</th><th className="text-start">{t("items.qty")}</th><th className="text-start">{t("items.approved")}</th><th className="text-start">{t("items.issued")}</th><th className="text-start">{t("items.received")}</th><th className="text-start">{t("items.used")}</th><th className="text-start">{t("items.returned")}</th>{showStock ? <th className="text-start">{t("items.available")}</th> : null}<th className="text-start">{t("items.status")}</th></tr></thead>
                    <tbody>
                      {order.items.map((i) => (
                        <tr key={i.id} className="border-t">
                          <td className="py-2" dir="auto">{i.partName}{i.partCode ? <span className="text-xs text-muted-foreground"> · {i.partCode}</span> : null}</td>
                          <td>{i.quantity}</td><td>{i.approvedQuantity ?? "—"}</td><td>{i.issuedQuantity ?? "—"}</td><td data-testid="line-received">{i.pendingReceiptQuantity > 0 ? <span className="text-amber-600">{t("items.pendingReceipt", { count: i.pendingReceiptQuantity })}</span> : i.receivedQuantity ?? "—"}</td><td>{i.usedQuantity ?? "—"}</td><td>{i.returnedQuantity ?? "—"}</td>
                          {showStock ? <td data-testid="line-available">{i.availableQuantity ?? "—"}</td> : null}
                          <td><Badge variant="outline">{t(`itemStatus.${i.status}`, { defaultValue: i.status })}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {editing ? (
                <div className="space-y-2" data-testid="items-editor">
                  {draftLines.map((l, idx) => (
                    <div key={idx} className="flex flex-wrap items-end gap-2">
                      <div className="min-w-0 flex-1 space-y-1">
                        <Label className="text-xs">{t("items.part")}</Label>
                        <Input dir="auto" value={l.partName} onChange={(e) => setLines(draftLines.map((x, i) => (i === idx ? { ...x, partName: e.target.value } : x)))} />
                      </div>
                      <div className="w-24 space-y-1">
                        <Label className="text-xs">{t("items.qty")}</Label>
                        <Input type="number" min={1} value={l.quantity} onChange={(e) => setLines(draftLines.map((x, i) => (i === idx ? { ...x, quantity: e.target.value } : x)))} />
                      </div>
                      <Button type="button" size="icon" variant="ghost" aria-label={t("items.remove")} onClick={() => setLines(draftLines.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => setLines([...draftLines, { partName: "", quantity: "1" }])}><Plus className="me-1 h-4 w-4" />{t("items.add")}</Button>
                    <Button type="button" size="sm" disabled={busy || draftLines.length === 0 || draftLines.some((l) => !l.partName.trim() || !(Number(l.quantity) >= 1))} data-testid="save-items"
                      onClick={() => run.mutate({ kind: "editItems", items: draftLines.map((l) => {
                        const existing = order.items.find((i) => i.partName === l.partName.trim());
                        return { partName: l.partName.trim(), quantity: Math.floor(Number(l.quantity)), sparePartId: existing?.sparePartId ?? null };
                      }) })}>{t("items.save")}</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setLines(null)}>{t("items.cancelEdit")}</Button>
                  </div>
                </div>
              ) : act("editItems")?.allowed ? (
                <Button size="sm" variant="outline" data-testid="edit-items" onClick={() => setLines(draftLines.length ? draftLines : [{ partName: "", quantity: "1" }])}>{t("items.edit")}</Button>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">{t("actionsTitle")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Row k="submit" label={t("actions.submit")} onClick={() => run.mutate({ kind: "submit", warehouseId: chosenWarehouse ? Number(chosenWarehouse) : undefined })} />
              {candidates ? (
                <div className="space-y-2 rounded-md border p-3" data-testid="warehouse-choice">
                  <Label>{t("chooseWarehouse")}</Label>
                  <select className="w-full rounded-md border bg-background p-2 text-sm" value={chosenWarehouse} onChange={(e) => setChosenWarehouse(e.target.value)} data-testid="warehouse-select">
                    <option value="">{t("chooseWarehousePlaceholder")}</option>
                    {candidates.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <Button size="sm" disabled={!chosenWarehouse || busy} data-testid="submit-with-warehouse" onClick={() => run.mutate({ kind: "submit", warehouseId: Number(chosenWarehouse) })}>{t("actions.submit")}</Button>
                </div>
              ) : null}
              <Row k="maintenanceApprove" label={t("actions.maintenanceApprove")} onClick={() => run.mutate({ kind: "maintenanceApprove", decision: "APPROVE" })} />
              {unmapped.length > 0 && canListWarehouses ? (
                <div className="space-y-2 rounded-md border p-3" data-testid="map-panel">
                  <p className="text-sm font-medium">{t("mapping.title")}</p>
                  <p className="text-xs text-muted-foreground">{t("mapping.hint")}</p>
                  {catalogue.isError ? <p className="text-xs text-destructive" role="alert">{t("mapping.catalogueFailed")}</p> : null}
                  {order.items.filter((i) => unmapped.includes(i.id)).map((i) => (
                    <div key={i.id} className="flex flex-wrap items-center gap-2" data-testid="map-row">
                      <span className="min-w-0 flex-1 text-sm" dir="auto">{i.partName} × {i.approvedQuantity ?? i.quantity}</span>
                      <select className="h-9 rounded-md border bg-background px-2 text-sm" data-testid="map-select" value={mapChoice[i.id] ?? ""} onChange={(e) => setMapChoice((p) => ({ ...p, [i.id]: e.target.value }))}>
                        <option value="">{t("mapping.choose")}</option>
                        {(catalogue.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ""} — {c.quantity}</option>)}
                      </select>
                      <Button size="sm" variant="outline" disabled={busy || !mapChoice[i.id]} data-testid="map-submit"
                        onClick={() => run.mutate({ kind: "mapItem", itemId: i.id, sparePartId: Number(mapChoice[i.id]) })}>{t("mapping.map")}</Button>
                    </div>
                  ))}
                </div>
              ) : null}
              {act("approveAndIssue")?.allowed && issuableLines.length > 0 ? (
                <div className="space-y-2 rounded-md border p-3" data-testid="approve-issue-panel">
                  <p className="text-sm font-medium">{t("approveIssue.title")}</p>
                  <p className="text-xs text-muted-foreground">{t("approveIssue.hint")}</p>
                  {issuableLines.map((i) => {
                    const max = maxIssue(i);
                    const err = issueError(i);
                    return (
                      <div key={i.id} className="flex flex-wrap items-center gap-2" data-testid="issue-row">
                        <span className="min-w-0 flex-1 text-sm" dir="auto">{i.partName} <span className="text-xs text-muted-foreground">({t("issue.approved", { count: max })}{i.availableQuantity != null ? ` · ${t("approve.inStock", { count: i.availableQuantity })}` : ""})</span></span>
                        <Input className="w-24" type="number" min={0} max={max} aria-label={t("items.issued")} value={issueQty[i.id] ?? String(max)} onChange={(e) => setIssueQty((p) => ({ ...p, [i.id]: e.target.value }))} data-testid="issue-qty" />
                        {err === "range" ? <span className="text-xs text-destructive" role="alert" data-testid="issue-range">{t("issue.range", { max })}</span> : null}
                        {err === "stock" ? <span className="text-xs text-destructive" role="alert" data-testid="issue-short">{t("approveIssue.exceedsStock", { count: i.availableQuantity ?? 0 })}</span> : null}
                      </div>
                    );
                  })}
                  <Label htmlFor="issue-note" className="text-xs">{t("approveIssue.note")}</Label>
                  <Textarea id="issue-note" dir="auto" rows={2} value={issueNote} onChange={(e) => setIssueNote(e.target.value)} />
                  <Button size="sm" disabled={busy || issuableLines.some((i) => issueError(i) !== null) || issuableLines.every((i) => issueValue(i) === 0)} data-testid="action-approveAndIssue"
                    onClick={() => {
                      const quantities = issuableLines.map((i) => ({ itemId: i.id, quantity: issueValue(i) }));
                      const isFull = quantities.every((q, n) => q.quantity === maxIssue(issuableLines[n]));
                      run.mutate({ kind: "approveAndIssue", quantities: isFull ? undefined : quantities, note: issueNote.trim() || undefined });
                    }}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("actions.approveAndIssue")}
                  </Button>
                </div>
              ) : act("approveAndIssue") && ["ITEM_NOT_MAPPED", "ORDER_WAREHOUSE_NOT_SET"].includes(act("approveAndIssue")!.reason ?? "") ? (
                <p className="text-sm text-amber-600" role="status" data-testid="why-approveAndIssue">{reasonText(act("approveAndIssue")!.reason, act("approveAndIssue")!.actor)}</p>
              ) : null}
              {act("receive")?.allowed && issuedLines.length > 0 ? (
                <div className="space-y-2 rounded-md border p-3" data-testid="receive-panel">
                  <p className="text-sm font-medium">{t("receive.title")}</p>
                  <p className="text-xs text-muted-foreground">{t("receive.hint")}</p>
                  {issuedLines.map((i) => (
                    <div key={i.id} className="flex flex-wrap items-center gap-2" data-testid="receive-row">
                      <span className="min-w-0 flex-1 text-sm" dir="auto">{i.partName} <span className="text-xs text-muted-foreground">({t("receive.issued", { count: i.issuedQuantity ?? 0 })})</span></span>
                      <Input className="w-24" type="number" min={0} max={i.issuedQuantity ?? 0} aria-label={t("items.received")} value={receiveQty[i.id] ?? String(i.issuedQuantity ?? 0)} onChange={(e) => setReceiveQty((p) => ({ ...p, [i.id]: e.target.value }))} data-testid="receive-qty" />
                      {receiveInvalid(i) ? <span className="text-xs text-destructive" role="alert">{t("receive.range", { max: i.issuedQuantity ?? 0 })}</span> : null}
                    </div>
                  ))}
                  {receiveShort ? (
                    <div className="space-y-1" data-testid="receive-note-box">
                      <Label htmlFor="receive-note" className="text-xs">{t("receive.noteRequired")}</Label>
                      <Textarea id="receive-note" dir="auto" rows={2} value={receiveNote} onChange={(e) => setReceiveNote(e.target.value)} />
                    </div>
                  ) : null}
                  <Button size="sm" disabled={busy || issuedLines.some(receiveInvalid) || (receiveShort && !receiveNote.trim())} data-testid="action-receive"
                    onClick={() => {
                      const received = issuedLines.map((i) => ({ itemId: i.id, quantity: receiveValue(i) }));
                      run.mutate({ kind: "receive", received: receiveShort ? received : undefined, note: receiveNote.trim() || undefined });
                    }}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("actions.receive")}
                  </Button>
                </div>
              ) : null}
              {act("submitReturn")?.allowed && (order.status === "DELIVERED" || order.status === "PARTIAL_RETURN") ? (
                <div className="space-y-2 rounded-md border p-3" data-testid="return-form">
                  <p className="text-sm font-medium">{t("return.title")}</p>
                    <p className="text-xs text-muted-foreground">{t("return.hint")}</p>
                  {order.items.filter((i) => i.status === "DELIVERED").map((i) => {
                    const returnable = returnableOf(i);
                    return (
                      <div key={i.id} className="flex flex-wrap items-center gap-2" data-testid="return-row">
                        <span className="min-w-0 flex-1 text-sm" dir="auto">{i.partName} <span className="text-xs text-muted-foreground">({t("return.returnable", { count: returnable })}{i.pendingReturnQuantity > 0 ? ` · ${t("return.pending", { count: i.pendingReturnQuantity })}` : ""})</span></span>
                        <Input className="w-24" type="number" min={0} max={returnable} disabled={returnable === 0} aria-label={t("items.returned")} value={returnQty[i.id] ?? ""} onChange={(e) => setReturnQty((p) => ({ ...p, [i.id]: e.target.value }))} data-testid="return-qty" />
                        {Number(returnQty[i.id]) > returnable ? <span className="text-xs text-destructive" role="alert">{t("return.range", { max: returnable })}</span> : null}
                      </div>
                    );
                  })}
                  <Button size="sm" disabled={busy || !Object.values(returnQty).some((v) => Number(v) > 0) || order.items.some((i) => Number(returnQty[i.id]) > returnableOf(i))} data-testid="record-return"
                    onClick={() => run.mutate({ kind: "partialReturn", items: Object.entries(returnQty).filter(([, v]) => Number(v) > 0).map(([k, v]) => ({ itemId: Number(k), quantity: Math.floor(Number(v)) })) })}>
                    {t("return.record")}
                  </Button>
                </div>
              ) : null}
              {act("submitReturn")?.allowed && order.status === "PARTIAL_RETURN" ? (
                <Button size="sm" disabled={busy} data-testid="action-submitReturn" onClick={() => run.mutate({ kind: "submitReturn" })}>{t("actions.submitReturn")}</Button>
              ) : null}
              {act("confirmReturn")?.allowed && order.status === "RETURN_SUBMITTED" ? (
                <Button size="sm" disabled={busy} data-testid="action-acknowledgeReturn" onClick={() => run.mutate({ kind: "acknowledgeReturn" })}>{t("actions.acknowledgeReturn")}</Button>
              ) : null}
              {act("confirmReturn")?.allowed && order.status === "WAREHOUSE_CONFIRMATION" ? (
                <Button size="sm" disabled={busy} data-testid="action-confirmReturn" onClick={() => run.mutate({ kind: "confirmReturn" })}>{t("actions.confirmReturn")}</Button>
              ) : null}
              {act("confirmReturn")?.allowed && (order.status === "RETURN_SUBMITTED" || order.status === "WAREHOUSE_CONFIRMATION") ? (
                <div className="space-y-2 rounded-md border p-3" data-testid="reject-return-panel">
                  <Label htmlFor="return-reason">{t("return.rejectReason")}</Label>
                  <Textarea id="return-reason" dir="auto" value={returnReason} onChange={(e) => setReturnReason(e.target.value)} />
                  <Button size="sm" variant="destructive" disabled={busy || !returnReason.trim()} data-testid="action-rejectReturn" onClick={() => run.mutate({ kind: "rejectReturn", reason: returnReason.trim() })}>{t("actions.rejectReturn")}</Button>
                </div>
              ) : null}
              <Row k="close" label={t("actions.close")} onClick={() => run.mutate({ kind: "close" })} />
              <Row k="cancel" label={t("actions.cancel")} destructive onClick={() => run.mutate({ kind: "cancel" })} />
              {act("reject")?.allowed ? (
                <div className="space-y-2 rounded-md border p-3">
                  <Label htmlFor="reject-reason">{t("rejectReason")}</Label>
                  <Textarea id="reject-reason" dir="auto" value={reason} onChange={(e) => setReason(e.target.value)} />
                  <Button size="sm" variant="destructive" disabled={busy || !reason.trim()} data-testid="action-reject" onClick={() => run.mutate({ kind: "reject", reason: reason.trim() })}>{t("actions.reject")}</Button>
                </div>
              ) : null}
              {canListWarehouses && warehouses.isError ? <p className="text-xs text-muted-foreground">{t("warehousesUnavailable")}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">{t("activity")}</CardTitle></CardHeader>
            <CardContent>
              {order.updates.length === 0 ? <p className="text-sm text-muted-foreground">{t("noActivity")}</p> : (
                <ul className="space-y-2" data-testid="order-activity">
                  {order.updates.map((u) => (
                    <li key={u.id} className="border-s-2 ps-3 text-sm">
                      <p dir="auto">{u.newStatus ? <Badge variant="outline" className="me-2">{t(`status.${u.newStatus}`, { defaultValue: u.newStatus })}</Badge> : null}{u.message}</p>
                      <p className="text-xs text-muted-foreground">{u.by ?? "—"} · {u.createdAt ? new Date(u.createdAt).toLocaleString(i18n.language, { dateStyle: "medium", timeStyle: "short" }) : ""}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          {order.taskId && hasPermission("internal_tasks.read") ? (
            <Card>
              <CardHeader><CardTitle className="text-base">{t("taskTimeline")}</CardTitle></CardHeader>
              <CardContent><ActivityTimeline root="task" id={order.taskId} defaultOrder="desc" /></CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
