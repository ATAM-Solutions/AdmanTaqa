import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import useGetOrganization from "@/hooks/Organization/useGetOrganization";
import PendingApprovalGuard from "@/components/PendingApprovalGuard";
import useGetServiceOfferings from "@/hooks/ServiceOfferings/useGetServiceOfferings";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AsyncBoundary } from "@/components/patterns/AsyncBoundary";
import { formatDate } from "@/lib/i18n/formatters";
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  MapPin,
  Layers3,
} from "lucide-react";
import type { ServiceOffering } from "@/types/organization";
import CreateServiceOfferingDialog from "./Component/CreateServiceOfferingDialog";
import ViewServiceOfferingDialog from "./Component/ViewServiceOfferingDialog";
import EditServiceOfferingDialog from "./Component/EditServiceOfferingDialog";
import DeleteServiceOfferingDialog from "./Component/DeleteServiceOfferingDialog";

export default function ServiceOfferings() {
  const { t, i18n } = useTranslation("serviceOfferings");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [editing, setEditing] = useState<ServiceOffering | null>(null);
  const [deleting, setDeleting] = useState<ServiceOffering | null>(null);

  const { data: orgResponse, isLoading: orgLoading } = useGetOrganization();
  const organization = orgResponse?.data;
  const organizationId = organization?.id;

  const {
    data: offeringsResponse,
    isLoading: offeringsLoading,
    error: offeringsErrorObj,
  } = useGetServiceOfferings(organizationId ?? null);

  const offerings = useMemo(
    () => offeringsResponse?.data ?? [],
    [offeringsResponse?.data]
  );

  return (
    <PendingApprovalGuard organization={organization} isLoading={orgLoading}>
      <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("title")}
            </h1>
            <p className="text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("addOffering")}
          </Button>
        </div>

        <Card className="border-none shadow-xl bg-card/70 backdrop-blur-md">
          <CardContent>
            {!organizationId ? (
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-destructive">
                {t("orgIdMissing")}
              </div>
            ) : (
              <AsyncBoundary
                isLoading={offeringsLoading}
                error={offeringsErrorObj}
                isEmpty={offerings.length === 0}
                loadingFallback={<div className="py-12 text-center text-muted-foreground">{t("loading")}</div>}
                emptyFallback={<div className="py-12 text-center text-muted-foreground">{t("empty")}</div>}
              >
                <div className="space-y-3">
                  {offerings.map((offering) => (
                    <div
                      key={offering.id}
                      className="rounded-xl border p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="gap-1">
                            <Layers3 className="h-3 w-3" />
                            {offering.ServiceCategory?.nameEn}
                          </Badge>
                          <Badge variant="outline" className="gap-1">
                            <MapPin className="h-3 w-3" />
                            {offering.City?.name || t("cityFallback", { id: offering.cityId })} -{" "}
                            {offering.Governorate?.name ||
                              t("governorateFallback", { id: offering.governorateId })}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {t("createdLabel", { date: formatDate(offering.createdAt, i18n.language) })}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-lg font-bold min-w-[120px] text-end">
                          {Number(offering.amount).toFixed(2)} {offering.currency}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingId(offering.id)}
                        >
                          <Eye className="h-4 w-4 me-1" /> {t("view")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditing(offering)}
                        >
                          <Pencil className="h-4 w-4 me-1" /> {t("edit")}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleting(offering)}
                        >
                          <Trash2 className="h-4 w-4 me-1" /> {t("delete")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </AsyncBoundary>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateServiceOfferingDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        organizationId={organizationId}
      />

      <ViewServiceOfferingDialog
        open={viewingId != null}
        onOpenChange={(open) => !open && setViewingId(null)}
        organizationId={organizationId}
        offeringId={viewingId}
      />

      <EditServiceOfferingDialog
        open={editing != null}
        onOpenChange={(open) => !open && setEditing(null)}
        organizationId={organizationId}
        offering={editing}
      />

      <DeleteServiceOfferingDialog
        open={deleting != null}
        onOpenChange={(open) => !open && setDeleting(null)}
        organizationId={organizationId}
        offering={deleting}
      />
    </PendingApprovalGuard>
  );
}
