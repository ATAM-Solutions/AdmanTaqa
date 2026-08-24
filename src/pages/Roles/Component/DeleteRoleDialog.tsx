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
import useDeleteRole from "@/hooks/Roles/useDeleteRole";

type DeleteRoleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: { id: string; name: string } | null;
};

export default function DeleteRoleDialog({ open, onOpenChange, role }: DeleteRoleDialogProps) {
  const { t } = useTranslation("roles");
  const deleteMutation = useDeleteRole();

  const handleDelete = () => {
    if (!role) return;
    deleteMutation.mutate(role.id, {
      onSuccess: () => {
        toast.success(t("list.deleteSuccess", { name: role.name }));
        onOpenChange(false);
      },
      onError: (err) => toast.error((err as Error)?.message ?? t("list.deleteFailed")),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("list.deleteDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("list.deleteDialogDescription", { name: role?.name })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("list.deleteCancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? t("list.deleting") : t("list.deleteConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
