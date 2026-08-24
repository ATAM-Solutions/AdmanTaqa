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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import useGetAvailableTeamMembers from "@/hooks/Operators/useGetAvailableTeamMembers";
import useCreateOperator from "@/hooks/Operators/useCreateOperator";

const UNLINKED = "__unlinked__";

export default function CreateOperatorDialog() {
  const { t } = useTranslation("operators");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [userId, setUserId] = useState<string>(UNLINKED);

  const { data: teamResponse, isLoading: teamLoading } = useGetAvailableTeamMembers(open);
  const teamMembers = useMemo(() => teamResponse?.data ?? [], [teamResponse]);
  const createMutation = useCreateOperator();

  const resetForm = () => {
    setName("");
    setUserId(UNLINKED);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t("createDialog.nameRequired"));
      return;
    }
    createMutation.mutate(
      {
        name: name.trim(),
        userId: userId !== UNLINKED ? Number(userId) : null,
      },
      {
        onSuccess: () => {
          toast.success(t("toasts.created"));
          resetForm();
          setOpen(false);
        },
        onError: (err) => toast.error((err as Error)?.message ?? t("toasts.createFailed")),
      }
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {t("addOperator")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("createDialog.title")}</DialogTitle>
          <DialogDescription>{t("createDialog.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="operatorName">{t("createDialog.name")}</Label>
            <Input
              id="operatorName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("createDialog.namePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="linkedUser">{t("createDialog.linkedUser")}</Label>
            <Select value={userId} onValueChange={setUserId} disabled={teamLoading}>
              <SelectTrigger id="linkedUser">
                <SelectValue placeholder={t("createDialog.selectUser")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNLINKED}>{t("createDialog.noLink")}</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={String(member.id)}>
                    {member.fullName} ({member.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t("createDialog.linkedUserHint")}</p>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("createDialog.cancel")}
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? t("createDialog.submitting") : t("createDialog.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
