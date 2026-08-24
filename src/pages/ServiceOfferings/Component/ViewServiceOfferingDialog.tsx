import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import useGetServiceOfferingById from "@/hooks/ServiceOfferings/useGetServiceOfferingById";
import { formatDate } from "@/lib/i18n/formatters";

type ViewServiceOfferingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: number | null | undefined;
  offeringId: number | null;
};

export default function ViewServiceOfferingDialog({
  open,
  onOpenChange,
  organizationId,
  offeringId,
}: ViewServiceOfferingDialogProps) {
  const { t, i18n } = useTranslation("serviceOfferings");
  const { data: viewingResponse, isLoading } = useGetServiceOfferingById(
    organizationId ?? null,
    offeringId
  );

  const viewing = viewingResponse?.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("viewDialog.title")}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">{t("viewDialog.loading")}</div>
        ) : viewing ? (
          <div className="space-y-3 text-sm">

            <p>
              <span className="font-semibold">{t("viewDialog.category")}:</span>{" "}
              {viewing.ServiceCategory?.nameEn}
            </p>
            <p>
              <span className="font-semibold">{t("viewDialog.governorate")}:</span>{" "}
              {viewing.Governorate?.name || viewing.governorateId}
            </p>
            <p>
              <span className="font-semibold">{t("viewDialog.city")}:</span>{" "}
              {viewing.City?.name || viewing.cityId}
            </p>
            <p>
              <span className="font-semibold">{t("viewDialog.amount")}:</span>{" "}
              {Number(viewing.amount).toFixed(2)} {viewing.currency}
            </p>
            <p>
              <span className="font-semibold">{t("viewDialog.created")}:</span>{" "}
              {formatDate(viewing.createdAt, i18n.language, { dateStyle: "medium", timeStyle: "short" })}
            </p>
            <p>
              <span className="font-semibold">{t("viewDialog.updated")}:</span>{" "}
              {formatDate(viewing.updatedAt, i18n.language, { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            {t("viewDialog.notFound")}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
