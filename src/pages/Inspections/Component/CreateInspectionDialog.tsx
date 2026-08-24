import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Building2 } from "lucide-react";
import useGetOrganizations from "@/hooks/Organization/useGetOrganizations";
import useGetOrganizationById from "@/hooks/Organization/useGetOrganizationById";
import useCreateInspection from "@/hooks/Inspections/useCreateInspection";
import type { InspectionTargetType } from "@/types/inspection";

export default function CreateInspectionDialog() {
  const { t } = useTranslation("inspections");
  const [open, setOpen] = useState(false);
  const [targetType, setTargetType] = useState<InspectionTargetType>("FUEL_STATION");
  const [targetOrganizationId, setTargetOrganizationId] = useState<string>("");
  const [branchId, setBranchId] = useState<string>("");
  const [notes, setNotes] = useState("");

  const { data: orgsResponse, isLoading: orgsLoading } = useGetOrganizations({
    type: targetType,
    status: "APPROVED",
    limit: 100,
  });
  const organizations = useMemo(() => orgsResponse?.data?.items ?? [], [orgsResponse]);

  const { data: targetOrg } = useGetOrganizationById(
    targetType === "FUEL_STATION" && targetOrganizationId ? targetOrganizationId : null
  );
  const branches = targetOrg?.Branches ?? [];

  const createMutation = useCreateInspection();

  const resetForm = () => {
    setTargetType("FUEL_STATION");
    setTargetOrganizationId("");
    setBranchId("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOrganizationId) {
      toast.error(t("createDialog.selectTargetRequired"));
      return;
    }
    createMutation.mutate(
      {
        targetType,
        targetOrganizationId: Number(targetOrganizationId),
        branchId: branchId ? Number(branchId) : null,
        findings: notes.trim() ? { notes: notes.trim() } : null,
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
        <Button className="gap-2 shadow-md bg-rose-600 hover:bg-rose-500 text-white">
          <Plus className="h-4 w-4" />
          {t("page.newPlan")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{t("createDialog.title")}</DialogTitle>
          <DialogDescription>{t("createDialog.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetType">{t("createDialog.targetType")}</Label>
              <Select
                value={targetType}
                onValueChange={(v) => {
                  setTargetType(v as InspectionTargetType);
                  setTargetOrganizationId("");
                  setBranchId("");
                }}
              >
                <SelectTrigger id="targetType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FUEL_STATION">{t("targetType.FUEL_STATION")}</SelectItem>
                  <SelectItem value="SERVICE_PROVIDER">{t("targetType.SERVICE_PROVIDER")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="target">{t("createDialog.targetOrganization")}</Label>
              <Select
                value={targetOrganizationId}
                onValueChange={(v) => {
                  setTargetOrganizationId(v);
                  setBranchId("");
                }}
                disabled={orgsLoading}
              >
                <SelectTrigger id="target">
                  <SelectValue placeholder={t("createDialog.selectTarget")} />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={String(org.id)}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3" />
                        {org.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {targetType === "FUEL_STATION" && targetOrganizationId && (
            <div className="space-y-2">
              <Label htmlFor="branch">{t("createDialog.branch")}</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger id="branch">
                  <SelectValue placeholder={t("createDialog.selectBranch")} />
                </SelectTrigger>
                <SelectContent>
                  {branches.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      {t("createDialog.noBranches")}
                    </div>
                  ) : (
                    branches.map((branch) => (
                      <SelectItem key={branch.id} value={String(branch.id)}>
                        {branch.nameEn ?? branch.nameAr ?? `#${branch.id}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">{t("createDialog.findings")}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("createDialog.findingsPlaceholder")}
              className="min-h-[100px]"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("createDialog.cancel")}
            </Button>
            <Button
              type="submit"
              className="bg-rose-600 hover:bg-rose-500"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? t("createDialog.submitting") : t("createDialog.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
