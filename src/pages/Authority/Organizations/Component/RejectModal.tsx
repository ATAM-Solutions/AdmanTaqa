import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type RejectModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgName: string;
  isPending: boolean;
  onSubmit: (reason?: string) => void;
};

/** API requires reason when decision is REJECTED. */
export default function RejectModal({
  open,
  onOpenChange,
  orgName,
  isPending,
  onSubmit,
}: RejectModalProps) {
  const { t } = useTranslation("authority");
  const [reason, setReason] = useState("");

  const handleOpenChange = (next: boolean) => {
    if (!next) setReason("");
    onOpenChange(next);
  };

  const handleSubmit = () => {
    const trimmed = reason.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setReason("");
  };

  const canSubmit = reason.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("organizations.rejectModal.title")}</DialogTitle>
          <DialogDescription>
            {t("organizations.rejectModal.description", { name: orgName })}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="org-reject-reason">{t("organizations.rejectModal.reasonLabel")}</Label>
            <Textarea
              id="org-reject-reason"
              placeholder={t("organizations.rejectModal.reasonPlaceholder")}
              className="min-h-[100px]"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            {t("organizations.rejectModal.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isPending || !canSubmit}
          >
            {isPending ? t("organizations.rejectModal.rejecting") : t("organizations.rejectModal.reject")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
