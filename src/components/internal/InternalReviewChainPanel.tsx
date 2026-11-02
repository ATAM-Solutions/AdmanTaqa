import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, Loader2, Lock, RotateCcw, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { InternalOrderActionError } from "@/api/services/internalWorkOrderService";
import useOpsConfirmInternalWorkOrder from "@/hooks/Station/useOpsConfirmInternalWorkOrder";
import useOpsReturnInternalWorkOrder from "@/hooks/Station/useOpsReturnInternalWorkOrder";
import useFinalCloseInternalWorkOrder from "@/hooks/Station/useFinalCloseInternalWorkOrder";
import useReviewInternalWorkOrder from "@/hooks/Station/useReviewInternalWorkOrder";
import useCloseInternalWorkOrder from "@/hooks/Station/useCloseInternalWorkOrder";
import { orderActionFlags } from "@/lib/internalReviewChain";
import type {
  InternalWorkOrderItem,
  PartsReconciliationLine,
  ReviewChainActor,
  ReviewHistoryEntry,
} from "@/types/internalWorkOrder";

const ERROR_CODES = [
  "COMMENT_REQUIRED",
  "PARTS_UNRESOLVED",
  "WORK_ORDER_NOT_AWAITING_OPS_CONFIRMATION",
  "WORK_ORDER_NOT_AWAITING_FINAL_CLOSURE",
  "WORK_ORDER_LEGACY_WORKFLOW",
  "WORK_ORDER_REVIEW_CHAIN",
  "INSUFFICIENT_PERMISSIONS",
] as const;

const STAGE_KEYS = [
  "NOT_STARTED", "IN_EXECUTION", "AWAITING_MAINTENANCE_REVIEW", "AWAITING_OPERATIONS_REVIEW",
  "AWAITING_FINAL_CLOSURE", "AWAITING_WAREHOUSE_RETURN", "CLOSED",
];

/** Lines that still block closure, with a readable reason per blocker. */
function BlockingLines({ lines }: { lines: PartsReconciliationLine[] }) {
  const { t } = useTranslation("station");
  return (
    <ul className="space-y-1 text-sm" data-testid="blocking-lines">
      {lines.map((l, i) => (
        <li key={`${l.warehouseOrderId}-${l.itemId}-${i}`} className="flex flex-wrap items-center gap-2" data-testid="blocking-line">
          <span className="font-medium" dir="auto">{l.partName}</span>
          {l.blockers.map((b) => (
            <Badge key={b} variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">
              {t(`internalWorkOrders.chain.parts.blockers.${b}`, { defaultValue: b })}
            </Badge>
          ))}
        </li>
      ))}
    </ul>
  );
}

function PartsTable({ order }: { order: InternalWorkOrderItem }) {
  const { t } = useTranslation("station");
  const pr = order.partsReconciliation;
  const p = "internalWorkOrders.chain.parts";
  return (
    <Card data-testid="parts-reconciliation">
      <CardHeader><CardTitle className="text-base">{t(`${p}.title`)}</CardTitle></CardHeader>
      <CardContent>
        {!pr || !pr.hasIssuedParts ? (
          <p className="text-sm text-muted-foreground" data-testid="parts-none">{t(`${p}.none`)}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm" data-testid="parts-table">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  {["part", "issued", "received", "used", "returned", "awaitingWarehouse", "unresolved", "status"].map((c) => (
                    <th key={c} className="py-1 pe-3 text-start font-medium">{t(`${p}.${c}`)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pr.lines.map((l, i) => (
                  <tr key={`${l.warehouseOrderId}-${l.itemId}-${i}`} className="border-t align-top" data-testid="parts-row">
                    <td className="py-2 pe-3" dir="auto">
                      {l.partName}
                      {l.warehouseOrderId != null ? <span className="block text-xs text-muted-foreground">{t(`${p}.order`, { id: l.warehouseOrderId })}</span> : null}
                    </td>
                    <td className="pe-3">{l.issued}</td>
                    <td className="pe-3">{l.received ?? t(`${p}.notYet`)}</td>
                    <td className="pe-3">{l.used ?? t(`${p}.notYet`)}</td>
                    <td className="pe-3">{l.returned}</td>
                    <td className="pe-3">{l.returnPending}</td>
                    <td className="pe-3">{l.unresolved}</td>
                    <td className="space-y-1">
                      {l.blockers.length === 0 ? (
                        <Badge variant="secondary" data-testid="parts-resolved">{t(`${p}.resolved`)}</Badge>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {l.blockers.map((b) => (
                            <Badge key={b} variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400" data-testid={`blocker-${b}`}>
                              {t(`${p}.blockers.${b}`, { defaultValue: b })}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {l.shortfall > 0 ? <p className="text-xs text-muted-foreground" data-testid="parts-shortfall">{t(`${p}.shortfall`, { count: l.shortfall })}</p> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-medium">
                  <td className="py-2 pe-3">{t(`${p}.total`)}</td>
                  <td className="pe-3">{pr.totals.issued}</td>
                  <td className="pe-3">{pr.totals.received}</td>
                  <td className="pe-3">{pr.totals.used}</td>
                  <td className="pe-3">{pr.totals.returned}</td>
                  <td className="pe-3">{pr.totals.returnPending}</td>
                  <td className="pe-3">{pr.totals.unresolved}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ReviewHistoryList({ history }: { history: ReviewHistoryEntry[] }) {
  const { t, i18n } = useTranslation("station");
  const h = "internalWorkOrders.chain.history";
  // Append-only on the server (oldest first); newest first reads better, every round stays visible.
  const rows = [...history].reverse();
  return (
    <Card data-testid="review-history">
      <CardHeader><CardTitle className="text-base">{t(`${h}.title`)}</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t(`${h}.empty`)}</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id} className="border-s-2 ps-3 text-sm" data-testid="history-entry">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{t(`${h}.stage.${r.stage}`, { defaultValue: r.stage })}</span>
                  <Badge variant={r.decision === "RETURNED" ? "destructive" : "secondary"} data-testid={`decision-${r.decision}`}>
                    {t(`${h}.decision.${r.decision}`, { defaultValue: r.decision })}
                  </Badge>
                  {r.internalTaskId != null ? <span className="text-xs text-muted-foreground">{t(`${h}.task`, { id: r.internalTaskId })}</span> : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  <span dir="auto">{r.actor?.fullName || "—"}</span>
                  {r.createdAt ? ` · ${new Date(r.createdAt).toLocaleString(i18n.language, { dateStyle: "medium", timeStyle: "short" })}` : ""}
                </p>
                <p className={r.comment ? "mt-1" : "mt-1 text-muted-foreground"} dir="auto">{r.comment ?? t(`${h}.noComment`)}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function InternalReviewChainPanel({ order }: { order: InternalWorkOrderItem }) {
  const { t } = useTranslation("station");
  const { hasPermission } = useAuth();
  const [comment, setComment] = useState("");
  const [serverLines, setServerLines] = useState<PartsReconciliationLine[]>([]);
  const opsConfirm = useOpsConfirmInternalWorkOrder();
  const opsReturn = useOpsReturnInternalWorkOrder();
  const finalClose = useFinalCloseInternalWorkOrder();
  const legacyReview = useReviewInternalWorkOrder();
  const legacyClose = useCloseInternalWorkOrder();

  const canReview = hasPermission("internal_work_orders.review") || hasPermission("internal_tasks.review");
  const canOps = hasPermission("internal_work_orders.ops_confirm");
  // The server gates final-close and legacy review by internal_work_orders.review specifically.
  const flags = orderActionFlags(order, { review: hasPermission("internal_work_orders.review"), opsConfirm: canOps });
  const wf = order.workflow;
  const busy = opsConfirm.isPending || opsReturn.isPending || finalClose.isPending || legacyReview.isPending || legacyClose.isPending;

  const failure = (e: unknown) => {
    const code = e instanceof InternalOrderActionError ? e.code : null;
    const known = ERROR_CODES.find((c) => c === code);
    if (e instanceof InternalOrderActionError && e.code === "PARTS_UNRESOLVED") setServerLines(e.lines);
    toast.error(known ? t(`internalWorkOrders.chain.errors.${known}`) : e instanceof Error && e.message ? e.message : t("internalWorkOrders.chain.errors.generic"));
  };
  const done = (msg: string) => () => {
    setComment("");
    setServerLines([]);
    toast.success(msg);
  };

  const trimmed = comment.trim();
  const blockingLocal = !!order.partsReconciliation?.blocking || !!wf?.partsBlockingClosure;
  const blockingLines = (order.partsReconciliation?.lines ?? []).filter((l) => l.blockers.length > 0);
  const shownBlocking = blockingLines.length > 0 ? blockingLines : serverLines;
  const closeDisabled = busy || blockingLocal;

  // ---- next-action banner (chain orders only)
  const actorIsMe = (a: ReviewChainActor | null) =>
    a === "MAINTENANCE_MANAGER" ? canReview : a === "OPERATIONS_MANAGER" ? canOps : a === "TECHNICIAN" ? !canReview && !canOps : false;
  const stageKey = wf && STAGE_KEYS.includes(wf.stage) ? wf.stage : null;

  const hasActions = flags.opsConfirm || flags.finalClose || flags.legacyReview || flags.legacyClose;
  const showHistory = flags.chain || (order.reviewHistory ?? []).length > 0;
  if (!flags.chain && !hasActions && !showHistory) return null;

  return (
    <div className="space-y-6" data-testid="review-chain-panel">
      {flags.chain && wf ? (
        <Card className="border-primary/40" data-testid="next-action-banner">
          <CardContent className="space-y-1 py-4 text-sm">
            <p className="font-medium">{t("internalWorkOrders.chain.bannerTitle")}</p>
            {stageKey ? <p data-testid="banner-stage">{t(`internalWorkOrders.chain.stage.${stageKey}`)}</p> : null}
            {wf.nextActor ? (
              actorIsMe(wf.nextActor) ? (
                <p className="font-medium text-primary" data-testid="banner-you">{t("internalWorkOrders.chain.you")}</p>
              ) : (
                <p className="text-muted-foreground" data-testid="banner-waiting">
                  {t("internalWorkOrders.chain.waitingFor", { actor: t(`internalWorkOrders.chain.actor.${wf.nextActor}`) })}
                </p>
              )
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {flags.stuckLegacy && flags.legacyReview ? (
        <p className="text-sm text-amber-700 dark:text-amber-400" data-testid="legacy-stuck-hint">{t("internalWorkOrders.chain.legacy.stuckHint")}</p>
      ) : null}

      {hasActions ? (
        <Card data-testid="order-actions">
          <CardContent className="space-y-4 py-4">
            {flags.opsConfirm || flags.finalClose ? (
              <div className="space-y-1">
                <Label htmlFor="chain-comment">{t("internalWorkOrders.chain.comment.label")}</Label>
                <Textarea
                  id="chain-comment"
                  dir="auto"
                  rows={3}
                  maxLength={2000}
                  value={comment}
                  placeholder={t("internalWorkOrders.chain.comment.placeholder")}
                  onChange={(e) => setComment(e.target.value)}
                  data-testid="chain-comment"
                />
                <p className="text-xs text-muted-foreground">
                  {flags.opsConfirm ? t("internalWorkOrders.chain.comment.hintOps") : t("internalWorkOrders.chain.comment.hintClose")}
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {flags.opsConfirm ? (
                <>
                  <Button
                    size="sm"
                    disabled={busy}
                    className="gap-1"
                    data-testid="ops-confirm"
                    onClick={() => opsConfirm.mutate({ id: order.id, comment: trimmed || undefined }, { onSuccess: done(t("internalWorkOrders.chain.ops.confirmed")), onError: failure })}
                  >
                    {opsConfirm.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} {t("internalWorkOrders.chain.ops.confirm")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy || !trimmed}
                    className="gap-1"
                    data-testid="ops-return"
                    onClick={() => opsReturn.mutate({ id: order.id, comment: trimmed }, { onSuccess: done(t("internalWorkOrders.chain.ops.returned")), onError: failure })}
                  >
                    {opsReturn.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4 rtl:-scale-x-100" />} {t("internalWorkOrders.chain.ops.return")}
                  </Button>
                </>
              ) : null}
              {flags.finalClose ? (
                <Button
                  size="sm"
                  disabled={closeDisabled}
                  className="gap-1"
                  data-testid="final-close"
                  onClick={() => finalClose.mutate({ id: order.id, comment: trimmed || undefined }, { onSuccess: done(t("internalWorkOrders.chain.finalClose.closed")), onError: failure })}
                >
                  {finalClose.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} {t("internalWorkOrders.chain.finalClose.button")}
                </Button>
              ) : null}
              {flags.legacyReview ? (
                <>
                  <Button
                    size="sm"
                    className="gap-1"
                    disabled={busy}
                    data-testid="legacy-approve"
                    onClick={() => legacyReview.mutate({ id: order.id, body: { decision: "APPROVE" } }, { onSuccess: () => toast.success(t("internalWorkOrders.detail.toasts.approved")), onError: (e) => toast.error(e instanceof Error ? e.message : t("internalWorkOrders.detail.toasts.reviewFailed")) })}
                  >
                    <CheckCircle className="h-4 w-4" /> {t("internalWorkOrders.detail.approve")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1"
                    disabled={busy}
                    data-testid="legacy-reject"
                    onClick={() => legacyReview.mutate({ id: order.id, body: { decision: "REJECT" } }, { onSuccess: () => toast.success(t("internalWorkOrders.detail.toasts.rejected")), onError: (e) => toast.error(e instanceof Error ? e.message : t("internalWorkOrders.detail.toasts.reviewFailed")) })}
                  >
                    <XCircle className="h-4 w-4" /> {t("internalWorkOrders.detail.reject")}
                  </Button>
                </>
              ) : null}
              {flags.legacyClose ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  disabled={busy}
                  data-testid="legacy-close"
                  onClick={() => legacyClose.mutate(order.id, { onSuccess: () => toast.success(t("internalWorkOrders.detail.toasts.closed")), onError: (e) => toast.error(e instanceof Error ? e.message : t("internalWorkOrders.detail.toasts.closeFailed")) })}
                >
                  <Lock className="h-4 w-4" /> {t("internalWorkOrders.detail.close")}
                </Button>
              ) : null}
            </div>

            {flags.opsConfirm && !trimmed ? (
              <p className="text-xs text-muted-foreground" data-testid="ops-return-hint">{t("internalWorkOrders.chain.ops.returnNeedsComment")}</p>
            ) : null}

            {flags.finalClose && (blockingLocal || serverLines.length > 0) ? (
              <div className="space-y-2 rounded-md border border-amber-500/60 p-3" role="alert" data-testid="close-blocked">
                <p className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" /> {t("internalWorkOrders.chain.finalClose.blockedTitle")}
                </p>
                <p className="text-xs text-muted-foreground">{t("internalWorkOrders.chain.finalClose.blockedHint")}</p>
                <BlockingLines lines={shownBlocking} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {flags.chain ? <PartsTable order={order} /> : null}
      {showHistory ? <ReviewHistoryList history={order.reviewHistory ?? []} /> : null}
    </div>
  );
}
