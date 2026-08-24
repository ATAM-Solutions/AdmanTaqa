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
import useUpdateBranch from "@/hooks/Branches/useUpdateBranch";

type ToggleBranchActiveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: { id: number; name: string; isActive: boolean } | null;
};

export default function ToggleBranchActiveDialog({
  open,
  onOpenChange,
  branch,
}: ToggleBranchActiveDialogProps) {
  const { t } = useTranslation("branches");
  const updateMutation = useUpdateBranch(branch?.id);
  const willActivate = branch ? !branch.isActive : false;

  const handleConfirm = () => {
    if (!branch) return;
    updateMutation.mutate(
      { isActive: willActivate },
      {
        onSuccess: () => {
          toast.success(
            willActivate
              ? t("toggleActive.activatedSuccess", { name: branch.name })
              : t("toggleActive.deactivatedSuccess", { name: branch.name })
          );
          onOpenChange(false);
        },
        onError: (err) => toast.error((err as Error)?.message ?? t("toggleActive.failed")),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {willActivate ? t("toggleActive.activateTitle") : t("toggleActive.deactivateTitle")}
          </DialogTitle>
          <DialogDescription>
            {willActivate
              ? t("toggleActive.activateDescription", { name: branch?.name })
              : t("toggleActive.deactivateDescription", { name: branch?.name })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("toggleActive.cancel")}
          </Button>
          <Button
            variant={willActivate ? "default" : "destructive"}
            onClick={handleConfirm}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending
              ? t("toggleActive.saving")
              : willActivate
              ? t("toggleActive.activateConfirm")
              : t("toggleActive.deactivateConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
