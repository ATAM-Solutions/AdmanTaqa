import { useState, useEffect, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useUpdateUser from "@/hooks/Users/useUpdateUser";
import useGetRoles from "@/hooks/Roles/useGetRoles";
import useGetBranches from "@/hooks/Branches/useGetBranches";
import { Checkbox } from "@/components/ui/checkbox";
import { getBranchDisplayName } from "@/lib/company";
import type { UpdateUserBody, UserRoleRef } from "@/types/user";
import {
  isValidSaudiPhoneDigits,
  toFullSaudiPhone,
  parseDisplayToDigits,
  SAUDI_PHONE_ERROR_MESSAGE,
} from "@/lib/validation/phone";

const STATION_OWNER_ROLE_NAME = "Station Owner";

type EditUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: number | string;
    fullName: string;
    phone?: string | null;
    email?: string;
    roles?: UserRoleRef[];
    /** Currently assigned station ids (empty = organization-wide). */
    branchIds?: number[];
  };
};

export default function EditUserDialog({
  open,
  onOpenChange,
  user,
}: EditUserDialogProps) {
  const { t, i18n } = useTranslation("users");
  const updateMutation = useUpdateUser();
  const {
    data: branches = [],
    isLoading: branchesLoading,
    isError: branchesFailed,
    refetch: refetchBranches,
  } = useGetBranches();
  const { data: allRoles = [], isLoading: rolesLoading } = useGetRoles();

  const assignableRoles = useMemo(
    () =>
      allRoles.filter(
        (r) =>
          r.name.trim().toLowerCase() !== STATION_OWNER_ROLE_NAME.toLowerCase()
      ),
    [allRoles]
  );

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    roleId: "" as string,
    branchIds: [] as number[],
  });
  const [phoneError, setPhoneError] = useState("");

  const initialRoleId = user.roles?.[0]?.id ?? null;
  const initialPhoneDigits = parseDisplayToDigits(user.phone);
  const initialBranchKey = [...(user.branchIds ?? [])].sort((a, b) => a - b).join(",");
  const initialBranchIds = useMemo(
    () => (initialBranchKey ? initialBranchKey.split(",").map(Number) : []),
    [initialBranchKey]
  );

  useEffect(() => {
    if (open) {
      setForm({
        fullName: user.fullName,
        phone: initialPhoneDigits,
        email: user.email ?? "",
        roleId: initialRoleId != null ? String(initialRoleId) : "",
        branchIds: [...initialBranchIds],
      });
      setPhoneError("");
    }
  }, [
    open,
    user.fullName,
    user.phone,
    user.email,
    initialRoleId,
    initialPhoneDigits,
    initialBranchIds,
  ]);

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 9);
    setForm((p) => ({ ...p, phone: digits }));
    if (digits === "") setPhoneError("");
    else setPhoneError(isValidSaudiPhoneDigits(digits) ? "" : SAUDI_PHONE_ERROR_MESSAGE);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const body: UpdateUserBody = {};
    if (form.fullName.trim() !== user.fullName)
      body.fullName = form.fullName.trim();
    const phoneTrimmed = form.phone.trim();
    const currentPhoneFull = user.phone ? toFullSaudiPhone(initialPhoneDigits) : null;
    const newPhoneFull = phoneTrimmed ? toFullSaudiPhone(phoneTrimmed) : null;
    if (newPhoneFull !== currentPhoneFull) {
      if (phoneTrimmed && !isValidSaudiPhoneDigits(phoneTrimmed)) {
        setPhoneError(SAUDI_PHONE_ERROR_MESSAGE);
        return;
      }
      body.phone = newPhoneFull;
    }
    if ((form.email.trim() || "") !== (user.email ?? ""))
      body.email = form.email.trim() || undefined;
    const newRoleId =
      form.roleId === "" ? null : Number(form.roleId);
    const currentRoleId = user.roles?.[0]?.id ?? null;
    if (newRoleId !== currentRoleId) body.roleId = newRoleId;
    // Stations: only sent when the selection changed (omitted = the server keeps the current set).
    const selectedKey = [...form.branchIds].sort((a, b) => a - b).join(",");
    if (selectedKey !== initialBranchKey) body.branchIds = form.branchIds;

    if (Object.keys(body).length === 0) {
      toast.info(t("editDialog.noChanges"));
      return;
    }

    updateMutation.mutate(
      { id: user.id, body },
      {
        onSuccess: () => {
          toast.success(t("editDialog.success"));
          onOpenChange(false);
        },
        onError: (e) =>
          toast.error((e as Error)?.message ?? t("editDialog.error")),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("editDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("editDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-fullName">{t("editDialog.fullName")}</Label>
            <Input
              id="edit-fullName"
              value={form.fullName}
              onChange={(e) =>
                setForm((p) => ({ ...p, fullName: e.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">{t("editDialog.phone")}</Label>
            <div dir="ltr" className="flex rounded-md border border-input overflow-hidden">
              <span className="inline-flex items-center px-3 text-sm text-muted-foreground border-e border-input bg-muted/30">
                +966
              </span>
              <Input
                id="edit-phone"
                type="tel"
                inputMode="numeric"
                maxLength={9}
                placeholder="501234567"
                value={form.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
                aria-invalid={!!phoneError}
              />
            </div>
            {phoneError && <p className="text-xs text-destructive font-medium">{phoneError}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">{t("editDialog.email")}</Label>
            <Input
              id="edit-email"
              type="email"
              placeholder="user@example.com"
              value={form.email}
              onChange={(e) =>
                setForm((p) => ({ ...p, email: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-role">{t("editDialog.role")}</Label>
            <Select
              value={form.roleId || "none"}
              onValueChange={(v) =>
                setForm((p) => ({ ...p, roleId: v === "none" ? "" : v }))
              }
            >
              <SelectTrigger id="edit-role">
                <SelectValue
                  placeholder={
                    rolesLoading ? t("editDialog.loadingRoles") : t("editDialog.selectRolePlaceholder")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("editDialog.noRole")}</SelectItem>
                {assignableRoles.map((role) => (
                  <SelectItem key={role.id} value={String(role.id)}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("editDialog.stations")}</Label>
            {branchesLoading ? (
              <p className="text-sm text-muted-foreground">{t("editDialog.stationsLoading")}</p>
            ) : branchesFailed ? (
              <div className="flex items-center gap-3 text-sm text-destructive">
                <span>{t("editDialog.stationsLoadFailed")}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => refetchBranches()}>
                  {t("editDialog.stationsRetry")}
                </Button>
              </div>
            ) : branches.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("editDialog.stationsEmpty")}</p>
            ) : (
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-input p-2">
                {branches.map((b) => {
                  const checked = form.branchIds.includes(b.id);
                  return (
                    <label key={b.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted/50">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) =>
                          setForm((p) => ({
                            ...p,
                            branchIds: v ? [...p.branchIds, b.id] : p.branchIds.filter((x) => x !== b.id),
                          }))
                        }
                      />
                      <span>{getBranchDisplayName(b, i18n.language)}</span>
                    </label>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground">{t("editDialog.stationsHint")}</p>
            {form.branchIds.length === 0 && !branchesLoading && !branchesFailed && branches.length > 0 && (
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400" role="status">
                {t("editDialog.stationsClearWarning")}
              </p>
            )}
          </div>
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("editDialog.cancel")}
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? t("editDialog.saving") : t("editDialog.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
