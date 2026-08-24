import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import useDeleteServiceOffering from "@/hooks/ServiceOfferings/useDeleteServiceOffering";
import type { ServiceOffering } from "@/types/organization";

type DeleteServiceOfferingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: number | null | undefined;
  offering: ServiceOffering | null;
};

export default function DeleteServiceOfferingDialog({
  open,
  onOpenChange,
  organizationId,
  offering,
}: DeleteServiceOfferingDialogProps) {
  const { t } = useTranslation("serviceOfferings");
  const deleteMutation = useDeleteServiceOffering();

  const handleDelete = () => {
    if (!organizationId || !offering) return;
    deleteMutation.mutate(
      { organizationId, offeringId: offering.id },
      {
        onSuccess: () => {
          toast.success(t("deleteDialog.deleted"));
          onOpenChange(false);
        },
        onError: (err) =>
          toast.error((err as Error)?.message ?? t("deleteDialog.deleteFailed")),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("deleteDialog.description", { id: offering?.id })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("deleteDialog.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? t("deleteDialog.deleting") : t("deleteDialog.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
