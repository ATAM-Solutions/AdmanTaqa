import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useGetAvailableTeamMembers from "@/hooks/Operators/useGetAvailableTeamMembers";
import useUpdateOperator from "@/hooks/Operators/useUpdateOperator";
import type { OperatorItem } from "@/types/operator";

const UNLINKED = "__unlinked__";

type EditOperatorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operator: OperatorItem | null;
};

export default function EditOperatorDialog({ open, onOpenChange, operator }: EditOperatorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {operator && (
        <EditOperatorForm key={operator.id} operator={operator} onOpenChange={onOpenChange} />
      )}
    </Dialog>
  );
}

function EditOperatorForm({
  operator,
  onOpenChange,
}: {
  operator: OperatorItem;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("operators");
  const [name, setName] = useState(operator.name);
  const [userId, setUserId] = useState<string>(operator.userId ? String(operator.userId) : UNLINKED);

  const { data: teamResponse, isLoading: teamLoading } = useGetAvailableTeamMembers(true);
  const teamMembers = useMemo(() => teamResponse?.data ?? [], [teamResponse]);
  const updateMutation = useUpdateOperator();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    updateMutation.mutate(
      {
        id: operator.id,
        body: { name: name.trim(), userId: userId !== UNLINKED ? Number(userId) : null },
      },
      {
        onSuccess: () => {
          toast.success(t("toasts.updated"));
          onOpenChange(false);
        },
        onError: (err) => toast.error((err as Error)?.message ?? t("toasts.updateFailed")),
      }
    );
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t("editDialog.title")}</DialogTitle>
        <DialogDescription>{t("editDialog.description")}</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="editOperatorName">{t("createDialog.name")}</Label>
          <Input id="editOperatorName" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="editLinkedUser">{t("createDialog.linkedUser")}</Label>
          <Select value={userId} onValueChange={setUserId} disabled={teamLoading}>
            <SelectTrigger id="editLinkedUser">
              <SelectValue placeholder={t("createDialog.selectUser")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNLINKED}>{t("createDialog.noLink")}</SelectItem>
              {operator.LinkedUser && (
                <SelectItem value={String(operator.LinkedUser.id)}>
                  {operator.LinkedUser.fullName} ({operator.LinkedUser.email})
                </SelectItem>
              )}
              {teamMembers
                .filter((m) => m.id !== operator.LinkedUser?.id)
                .map((member) => (
                  <SelectItem key={member.id} value={String(member.id)}>
                    {member.fullName} ({member.email})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("createDialog.cancel")}
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? t("createDialog.submitting") : t("editDialog.save")}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
