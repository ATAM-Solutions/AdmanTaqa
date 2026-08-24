import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import AddBranchForm from "./AddBranchForm";

type AddBranchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
};

export default function AddBranchDialog({
  open,
  onOpenChange,
  trigger,
}: AddBranchDialogProps) {
  const { t } = useTranslation("branches");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="gap-2 shadow-sm bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            {t("list.addNewBranch")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("dialog.title")}</DialogTitle>
          <DialogDescription>{t("dialog.description")}</DialogDescription>
        </DialogHeader>
        <AddBranchForm
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
          showCancel
        />
      </DialogContent>
    </Dialog>
  );
}
