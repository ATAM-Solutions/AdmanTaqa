import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import useUpdateServiceOffering from "@/hooks/ServiceOfferings/useUpdateServiceOffering";
import type { ServiceOffering } from "@/types/organization";

type EditServiceOfferingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: number | null | undefined;
  offering: ServiceOffering | null;
};

export default function EditServiceOfferingDialog({
  open,
  onOpenChange,
  organizationId,
  offering,
}: EditServiceOfferingDialogProps) {
  const { t } = useTranslation("serviceOfferings");
  const updateMutation = useUpdateServiceOffering();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    if (!offering) return;
    setAmount(String(offering.amount));
    setCurrency(offering.currency || "USD");
  }, [offering]);

  const handleUpdate = () => {
    if (!organizationId || !offering) return;
    const body: { amount?: number; currency?: string } = {};
    const amountNum = Number(amount);
    if (
      amount.trim() !== "" &&
      Number.isFinite(amountNum) &&
      amountNum > 0 &&
      amountNum !== Number(offering.amount)
    ) {
      body.amount = amountNum;
    }
    if (currency.trim() && currency !== offering.currency) {
      body.currency = currency.trim().toUpperCase();
    }

    if (Object.keys(body).length === 0) {
      toast.info(t("editDialog.noChanges"));
      return;
    }

    updateMutation.mutate(
      { organizationId, offeringId: offering.id, body },
      {
        onSuccess: () => {
          toast.success(t("editDialog.updated"));
          onOpenChange(false);
        },
        onError: (err) =>
          toast.error((err as Error)?.message ?? t("editDialog.updateFailed")),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("editDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("editDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder={t("editDialog.amountPlaceholder")}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Input
            maxLength={3}
            placeholder={t("editDialog.currencyPlaceholder")}
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("editDialog.cancel")}
          </Button>
          <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? t("editDialog.saving") : t("editDialog.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
