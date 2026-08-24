import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type RejectBranchRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending?: boolean;
  onSubmit: (reason?: string) => void;
};

export default function RejectBranchRequestDialog({
  open,
  onOpenChange,
  isPending,
  onSubmit,
}: RejectBranchRequestDialogProps) {
  const { t } = useTranslation("branchRequests");
  const [reason, setReason] = useState("");

  const submit = () => {
    onSubmit(reason.trim() || undefined);
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("rejectDialog.title")}</DialogTitle>
          <DialogDescription>{t("rejectDialog.description")}</DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("rejectDialog.placeholder")}
          className="min-h-[100px]"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("rejectDialog.cancel")}
          </Button>
          <Button variant="destructive" onClick={submit} disabled={isPending}>
            {isPending ? t("rejectDialog.rejecting") : t("rejectDialog.reject")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
