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
import useDeleteOperator from "@/hooks/Operators/useDeleteOperator";

type DeleteOperatorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operator: { id: number; name: string } | null;
};

export default function DeleteOperatorDialog({ open, onOpenChange, operator }: DeleteOperatorDialogProps) {
  const { t } = useTranslation("operators");
  const deleteMutation = useDeleteOperator();

  const handleDelete = () => {
    if (!operator) return;
    deleteMutation.mutate(operator.id, {
      onSuccess: () => {
        toast.success(t("toasts.deleted", { name: operator.name }));
        onOpenChange(false);
      },
      onError: (err) => toast.error((err as Error)?.message ?? t("toasts.deleteFailed")),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteDialog.title")}</DialogTitle>
          <DialogDescription>{t("deleteDialog.description", { name: operator?.name })}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("createDialog.cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? t("deleteDialog.deleting") : t("deleteDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
