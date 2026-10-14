import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, Building2, UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import useLinkedProviders from "@/hooks/Station/useLinkedProviders";
import useProviderDirectory from "@/hooks/Station/useProviderDirectory";
import { Input } from "@/components/ui/input";
import type { ProviderClassification } from "@/api/services/stationService";
import useAddLinkedProvider from "@/hooks/Station/useAddLinkedProvider";
import useRemoveLinkedProvider from "@/hooks/Station/useRemoveLinkedProvider";

export default function LinkedProviders() {
  const { t } = useTranslation("station");
  const { data: linked = [], isLoading } = useLinkedProviders();
  const [search, setSearch] = useState("");
  const [classification, setClassification] = useState<ProviderClassification | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const directory = useProviderDirectory({
    page,
    limit: PAGE_SIZE,
    search,
    classification: classification === "ALL" ? undefined : classification,
  });
  const addMutation = useAddLinkedProvider();
  const removeMutation = useRemoveLinkedProvider();
  const [removeTarget, setRemoveTarget] = useState<{ linkId: number; name: string } | null>(null);

  const items = directory.data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((directory.data?.total ?? 0) / PAGE_SIZE));
  const FILTERS: Array<ProviderClassification | "ALL"> = ["ALL", "AVAILABLE", "LINKED", "LINK_INACTIVE", "INACTIVE", "INELIGIBLE"];

  const handleAdd = (orgId: number) => {
    addMutation.mutate(
      { providerOrganizationId: orgId },
      {
        onSuccess: () => toast.success(t("linkedProviders.toasts.added")),
        onError: (e) => toast.error(e instanceof Error ? e.message : t("linkedProviders.toasts.addFailed")),
      }
    );
  };

  const openRemoveModal = (linkId: number, name: string) => {
    setRemoveTarget({ linkId, name });
  };

  const handleRemoveConfirm = () => {
    if (!removeTarget) return;
    removeMutation.mutate(removeTarget.linkId, {
      onSuccess: () => {
        toast.success(t("linkedProviders.toasts.removed"));
        setRemoveTarget(null);
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : t("linkedProviders.toasts.removeFailed")),
    });
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-2">
        <Link to="/station-requests">
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          {t("linkedProviders.backToRequests")}
        </Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("linkedProviders.title")}</h1>
        <p className="text-muted-foreground">{t("linkedProviders.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t("linkedProviders.linkedHeading", { count: linked.length })}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("linkedProviders.linkedDescription")}</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          ) : linked.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("linkedProviders.noLinked")}</p>
          ) : (
            <ul className="space-y-2">
              {linked.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {p.organizationName ?? t("linkedProviders.organizationFallback", { id: p.organizationId })}
                    </span>
                    {p.status && (
                      <Badge variant="secondary" className="text-xs">
                        {p.status}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive gap-1"
                    onClick={() => openRemoveModal(p.id, p.organizationName ?? "")}
                    disabled={removeMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("linkedProviders.remove")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {t("linkedProviders.availableHeading")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("linkedProviders.availableDescription")}</p>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={t("linkedProviders.directory.searchPlaceholder")}
              aria-label={t("linkedProviders.directory.searchPlaceholder")}
              className="sm:max-w-xs"
            />
            <div className="flex flex-wrap gap-2" role="group" aria-label={t("linkedProviders.directory.filterLabel")}>
              {FILTERS.map((f) => (
                <Button
                  key={f}
                  type="button"
                  size="sm"
                  variant={classification === f ? "default" : "outline"}
                  onClick={() => { setClassification(f); setPage(1); }}
                >
                  {t(`linkedProviders.directory.filter.${f}`)}
                  {f !== "ALL" && directory.data?.counts?.[f] != null ? ` (${directory.data.counts[f]})` : ""}
                </Button>
              ))}
            </div>
          </div>
          {directory.isLoading ? (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          ) : directory.isError ? (
            <div className="flex items-center gap-3 text-sm text-destructive" role="alert">
              <span>{t("linkedProviders.directory.loadFailed")}</span>
              <Button type="button" size="sm" variant="outline" onClick={() => directory.refetch()}>
                {t("linkedProviders.directory.retry")}
              </Button>
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("linkedProviders.directory.empty")}</p>
          ) : (
            <ul className="space-y-2">
              {items.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-lg border p-3" data-testid={`provider-row-${p.id}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{p.name}</span>
                    <Badge variant={p.classification === "AVAILABLE" || p.classification === "LINKED" ? "secondary" : "outline"} className="text-xs">
                      {t(`linkedProviders.directory.class.${p.classification}`)}
                    </Badge>
                    {p.reasons.map((r) => (
                      <span key={r} className="text-xs text-muted-foreground">{t(`linkedProviders.directory.reason.${r}`, { defaultValue: r })}</span>
                    ))}
                  </div>
                  {(p.classification === "AVAILABLE" || p.classification === "LINK_INACTIVE") && (
                    <Button size="sm" className="gap-1" onClick={() => handleAdd(p.id)} disabled={addMutation.isPending}>
                      <UserPlus className="h-4 w-4" />
                      {t("linkedProviders.add")}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>
                {t("linkedProviders.directory.prev")}
              </Button>
              <span>{t("linkedProviders.directory.pageOf", { page, total: totalPages })}</span>
              <Button type="button" size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((n) => n + 1)}>
                {t("linkedProviders.directory.next")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("linkedProviders.removeDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("linkedProviders.removeDialog.description", { name: removeTarget?.name || t("linkedProviders.removeDialog.defaultName") })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              {t("linkedProviders.removeDialog.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveConfirm}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? t("linkedProviders.removeDialog.removing") : t("linkedProviders.removeDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
