import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { LocationLevel } from "./LocationFormDialog";

type LocationDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  level: LocationLevel;
  itemName: string;
  onConfirm: () => void;
  submitting: boolean;
};

export default function LocationDeleteDialog({
  open,
  onOpenChange,
  level,
  itemName,
  onConfirm,
  submitting,
}: LocationDeleteDialogProps) {
  const { t } = useTranslation("locations");
  const label = t(`levels.${level}`);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t("delete.title", { level: label })}</DialogTitle>
          <DialogDescription>
            {t("delete.description", { name: itemName })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t("delete.cancel")}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("delete.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
