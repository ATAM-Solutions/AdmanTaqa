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
import useAvailableProviders from "@/hooks/Station/useAvailableProviders";
import useAddLinkedProvider from "@/hooks/Station/useAddLinkedProvider";
import useRemoveLinkedProvider from "@/hooks/Station/useRemoveLinkedProvider";

export default function LinkedProviders() {
  const { t } = useTranslation("station");
  const { data: linked = [], isLoading } = useLinkedProviders();
  const { data: available = [] } = useAvailableProviders();
  const addMutation = useAddLinkedProvider();
  const removeMutation = useRemoveLinkedProvider();
  const [removeTarget, setRemoveTarget] = useState<{ linkId: number; name: string } | null>(null);

  const linkedOrgIds = new Set(linked.map((p) => p.organizationId));
  const canAdd = available.filter((p) => !linkedOrgIds.has(p.organizationId));

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
          {canAdd.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("linkedProviders.noAvailable")}</p>
          ) : (
            <ul className="space-y-2">
              {canAdd.map((p) => (
                <li
                  key={p.organizationId}
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
                    size="sm"
                    className="gap-1"
                    onClick={() => handleAdd(p.organizationId)}
                    disabled={addMutation.isPending}
                  >
                    <UserPlus className="h-4 w-4" />
                    {t("linkedProviders.add")}
                  </Button>
                </li>
              ))}
            </ul>
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
