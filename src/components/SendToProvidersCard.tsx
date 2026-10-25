import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Building2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/utils";
import { sendStationRequestToProviders } from "@/api/services/stationService";
import useLinkedProviders from "@/hooks/Station/useLinkedProviders";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/** Statuses in which the API still accepts more providers (before a quote is selected). */
const OPEN_STATUSES = new Set(["SUBMITTED_BY_STATION", "TRIAGED_BY_OPERATOR", "SENT_TO_PROVIDERS", "QUOTING_OPEN"]);

export interface RequestRecipient {
  organizationId: number;
  name: string | null;
  sentAt?: string | null;
}

interface Props {
  requestId: number | string;
  status?: string;
  recipients: RequestRecipient[];
}

/**
 * Choose which linked providers receive an external request, and add more while quotes are still open. Only linked,
 * active providers are offered, and ones that already received the request are shown as sent (the API never duplicates).
 */
export default function SendToProvidersCard({ requestId, status, recipients }: Props) {
  const { t } = useTranslation("station");
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const { data: linked = [], isLoading } = useLinkedProviders();
  const [selected, setSelected] = useState<number[]>([]);
  const send = useMutation({
    mutationFn: (ids: number[]) => sendStationRequestToProviders(requestId, { providerAudience: "SELECTED_LINKED", providerOrganizationIds: ids }),
    onSuccess: () => {
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ["station-request"] });
      queryClient.invalidateQueries({ queryKey: ["station-requests"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      toast.success(t("sendProviders.sent"));
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("sendProviders.failed"))),
  });

  if (!hasPermission("station.requests.send_to_providers") || !status || !OPEN_STATUSES.has(status)) return null;

  const sentIds = new Set(recipients.map((r) => r.organizationId));
  const available = linked.filter((p) => (p.status ?? "ACTIVE") === "ACTIVE" && !sentIds.has(p.organizationId));
  const toggle = (id: number) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <Card data-testid="send-providers-card">
      <CardHeader>
        <CardTitle>{t("sendProviders.title")}</CardTitle>
        <CardDescription>{recipients.length === 0 ? t("sendProviders.noneSent") : t("sendProviders.alreadySent", { count: recipients.length })}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recipients.length > 0 ? (
          <ul className="flex flex-wrap gap-2" data-testid="send-providers-recipients">
            {recipients.map((r) => (
              <li key={r.organizationId} className="rounded-md border bg-muted/40 px-2 py-1 text-xs">
                <Building2 className="me-1 inline h-3 w-3" aria-hidden="true" />
                <span dir="auto">{r.name ?? t("sendProviders.providerFallback", { id: r.organizationId })}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("sendProviders.loading")}</p>
        ) : available.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="send-providers-none">
            {linked.length === 0 ? t("sendProviders.noLinked") : t("sendProviders.allSent")}{" "}
            <Link to="/linked-providers" className="font-medium underline">{t("sendProviders.manageLinks")}</Link>
          </p>
        ) : (
          <>
            <div className="flex max-h-48 flex-col gap-2 overflow-y-auto" role="group" aria-label={t("sendProviders.pick")}>
              {available.map((p) => (
                <label key={p.organizationId} className="flex cursor-pointer items-center gap-3 rounded-md border bg-background px-3 py-2 hover:bg-muted/50">
                  <Checkbox checked={selected.includes(p.organizationId)} onCheckedChange={() => toggle(p.organizationId)} data-testid={`send-provider-${p.organizationId}`} />
                  <span className="font-medium" dir="auto">{p.organizationName ?? t("sendProviders.providerFallback", { id: p.organizationId })}</span>
                </label>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button disabled={selected.length === 0 || send.isPending} onClick={() => send.mutate(selected)} data-testid="send-providers-submit">
                {send.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Send className="me-2 h-4 w-4 rtl:-scale-x-100" />}
                {t("sendProviders.submit", { count: selected.length })}
              </Button>
              <Button variant="outline" disabled={send.isPending} onClick={() => setSelected(available.map((p) => p.organizationId))}>
                {t("sendProviders.selectAll")}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
