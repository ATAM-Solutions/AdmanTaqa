import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchSparePartRequests, type SparePartRequest } from "@/api/services/taskDetailService";
import { formatDate } from "@/lib/i18n/formatters";

/**
 * The spare-parts requests of a task or work order: items, the Maintenance decision, the warehouse, who acts next and the
 * history. Read-only — every action still happens on the task / warehouse order itself, behind its own permission.
 */
export default function SparePartRequestsPanel({ root, id }: { root: "task" | "workOrder"; id: number | string }) {
  const { t, i18n } = useTranslation("warehouse", { keyPrefix: "sparePartRequests" });
  const ar = i18n.language.startsWith("ar");
  const query = useQuery({
    queryKey: ["spare-part-requests", root, id],
    queryFn: () => fetchSparePartRequests(root, id),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const fmt = (v: string | null | undefined) =>
    v ? formatDate(v, i18n.language, { dateStyle: "medium", timeStyle: "short" }) : "—";

  return (
    <Card data-testid="spare-part-requests">
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground">…</p>
        ) : query.isError ? (
          <p className="text-sm text-destructive" role="alert">{t("loadFailed")}</p>
        ) : (query.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="spare-part-requests-empty">{t("empty")}</p>
        ) : (
          (query.data ?? []).map((r: SparePartRequest) => {
            const decisionTone = r.maintenanceApproval.decision === "APPROVED" ? "default" : r.maintenanceApproval.decision === "REJECTED" ? "destructive" : "secondary";
            return (
              <div key={r.warehouseOrderId ?? `pending-${r.taskId}`} className="space-y-3 rounded-md border p-3" data-testid={`spare-part-request-${r.warehouseOrderId ?? "pending"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {r.warehouseOrderId != null ? (
                        r.canOpenWarehouseOrder ? (
                          <Link className="underline" to={`/warehouse-requests/${r.warehouseOrderId}`} data-testid="open-warehouse-order">
                            {t("openOrder", { id: r.warehouseOrderId })}
                          </Link>
                        ) : (
                          <span dir="ltr">#{r.warehouseOrderId}</span>
                        )
                      ) : (
                        t("requestPending")
                      )}
                    </span>
                    {r.taskId != null ? (
                      <Link className="text-sm text-muted-foreground underline" to={`/internal-tasks/${r.taskId}`}>
                        {t("task", { id: r.taskId })}
                      </Link>
                    ) : null}
                  </div>
                  <Badge variant="outline" data-testid="spare-part-request-status">{ar ? r.statusLabel.ar : r.statusLabel.en}</Badge>
                </div>

                <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <div><dt className="text-muted-foreground">{t("requestedBy")}</dt><dd>{r.requestedBy?.fullName ?? "—"}</dd></div>
                  <div><dt className="text-muted-foreground">{t("requestedAt")}</dt><dd>{fmt(r.requestedAt)}</dd></div>
                  <div>
                    <dt className="text-muted-foreground">{t("maintenanceDecision")}</dt>
                    <dd><Badge variant={decisionTone}>{t(`decision.${r.maintenanceApproval.decision}`)}</Badge></dd>
                  </div>
                  <div><dt className="text-muted-foreground">{t("reviewer")}</dt><dd>{r.maintenanceApproval.by?.fullName ?? "—"}</dd></div>
                  <div><dt className="text-muted-foreground">{t("reviewedAt")}</dt><dd>{fmt(r.maintenanceApproval.at)}</dd></div>
                  <div><dt className="text-muted-foreground">{t("warehouse")}</dt><dd>{r.warehouse?.name ?? t("noWarehouse")}</dd></div>
                  {r.nextAction ? (
                    <>
                      <div><dt className="text-muted-foreground">{t("nextAction")}</dt><dd data-testid="spare-part-request-next">{ar ? r.nextAction.label.ar : r.nextAction.label.en}</dd></div>
                      <div>
                        <dt className="text-muted-foreground">{r.responsibleUsers.length > 0 ? t("responsibleUser") : t("responsibleRole")}</dt>
                        <dd>
                          {r.responsibleUsers.length > 0
                            ? r.responsibleUsers.map((u) => u.fullName).filter(Boolean).join("، ")
                            : t(`role.${r.nextAction.role}`, { defaultValue: r.nextAction.role })}
                          {r.nextAction.routing === "ROLE_QUEUE" && r.responsibleUsers.length === 0 ? (
                            <span className="block text-xs text-muted-foreground">{t("roleQueue")}</span>
                          ) : null}
                        </dd>
                      </div>
                    </>
                  ) : null}
                </dl>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-start text-muted-foreground">
                        <th className="py-1 pe-3 text-start font-normal">{t("items")}</th>
                        <th className="px-2 text-start font-normal">{t("quantity")}</th>
                        <th className="px-2 text-start font-normal">{t("approved")}</th>
                        <th className="px-2 text-start font-normal">{t("issued")}</th>
                        <th className="px-2 text-start font-normal">{t("received")}</th>
                        <th className="px-2 text-start font-normal">{t("returned")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.items.map((i) => (
                        <tr key={i.id} className="border-t">
                          <td className="py-1 pe-3">{i.partName}{i.partCode ? <span dir="ltr" className="ms-2 text-xs text-muted-foreground">{i.partCode}</span> : null}</td>
                          <td className="px-2">{i.quantity}{i.unit ? ` ${i.unit}` : ""}</td>
                          <td className="px-2">{i.approvedQuantity ?? "—"}</td>
                          <td className="px-2">{i.issuedQuantity ?? "—"}</td>
                          <td className="px-2">{i.receivedQuantity ?? "—"}</td>
                          <td className="px-2">{i.returnedQuantity ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {r.timeline.length > 0 ? (
                  <details>
                    <summary className="cursor-pointer text-sm text-muted-foreground">{t("timeline")}</summary>
                    <ul className="mt-2 space-y-1 text-sm">
                      {r.timeline.map((e) => (
                        <li key={e.id}>
                          <span className="text-muted-foreground">{fmt(e.at)}</span> — {e.by?.fullName ?? "—"}
                          {e.newStatus ? <span dir="ltr" className="mx-1 text-xs">[{e.newStatus}]</span> : null}
                          {e.message ? ` ${e.message}` : ""}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
