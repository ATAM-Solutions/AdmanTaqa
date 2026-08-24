import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import useDeactivateUser from "@/hooks/Users/useDeactivateUser";

type DeactivateUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { id: number | string; fullName: string } | null;
};

export default function DeactivateUserDialog({
  open,
  onOpenChange,
  user,
}: DeactivateUserDialogProps) {
  const { t } = useTranslation("users");
  const deactivateMutation = useDeactivateUser();

  const handleDeactivate = () => {
    if (!user) return;
    deactivateMutation.mutate(user.id, {
      onSuccess: () => {
        toast.success(t("deactivateDialog.success"));
        onOpenChange(false);
      },
      onError: (e) =>
        toast.error((e as Error)?.message ?? t("deactivateDialog.error")),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deactivateDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("deactivateDialog.description", { name: user?.fullName })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("deactivateDialog.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeactivate}
            disabled={deactivateMutation.isPending}
          >
            {deactivateMutation.isPending ? t("deactivateDialog.deactivating") : t("deactivateDialog.deactivate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
