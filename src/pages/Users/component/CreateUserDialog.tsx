import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { UserPlus } from "lucide-react";
import useCreateUser from "@/hooks/Users/useCreateUser";
import useGetRoles from "@/hooks/Roles/useGetRoles";
import useGetBranches from "@/hooks/Branches/useGetBranches";
import { Checkbox } from "@/components/ui/checkbox";
import { getBranchDisplayName } from "@/lib/company";
import type { CreateUserBody } from "@/types/user";
import {
  isValidSaudiPhoneDigits,
  toFullSaudiPhone,
  SAUDI_PHONE_ERROR_MESSAGE,
} from "@/lib/validation/phone";

type CreateUserForm = {
  email: string;
  fullName: string;
  password: string;
  phone?: string;
  roleId: string;
  branchIds: number[];
};

const initialForm: CreateUserForm = {
  email: "",
  fullName: "",
  password: "",
  phone: "",
  roleId: "",
  branchIds: [],
};

type CreateUserDialogProps = {
  /** Optional custom trigger; defaults to "Create New User" button */
  trigger?: React.ReactNode;
};

export default function CreateUserDialog({ trigger }: CreateUserDialogProps) {
  const { t, i18n } = useTranslation("users");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [phoneError, setPhoneError] = useState("");
  const createMutation = useCreateUser();
  const { data: roles = [], isLoading: rolesLoading } = useGetRoles();
  const {
    data: branches = [],
    isLoading: branchesLoading,
    isError: branchesFailed,
    refetch: refetchBranches,
  } = useGetBranches();

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 9);
    setForm((p) => ({ ...p, phone: digits }));
    if (digits === "") setPhoneError("");
    else setPhoneError(isValidSaudiPhoneDigits(digits) ? "" : SAUDI_PHONE_ERROR_MESSAGE);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const phoneTrimmed = form.phone?.trim() ?? "";
    if (phoneTrimmed && !isValidSaudiPhoneDigits(phoneTrimmed)) {
      setPhoneError(SAUDI_PHONE_ERROR_MESSAGE);
      return;
    }
    const body: CreateUserBody = {
      email: form.email.trim(),
      fullName: form.fullName.trim(),
      password: form.password,
      phone: phoneTrimmed ? toFullSaudiPhone(phoneTrimmed) : undefined,
      roleId: form.roleId ? Number(form.roleId) : undefined,
      // Only sent when stations were chosen; nothing selected keeps the historical company-wide result (warned below).
      branchIds: form.branchIds.length > 0 ? form.branchIds : undefined,
    };
    createMutation.mutate(body, {
      onSuccess: () => {
        toast.success(t("createDialog.success"));
        setOpen(false);
        setForm(initialForm);
      },
      onError: (e) => toast.error((e as Error)?.message ?? t("createDialog.error")),
    });
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setForm(initialForm);
      setPhoneError("");
    }
    setOpen(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="gap-2 shadow-sm">
            <UserPlus className="h-4 w-4" />
            {t("createDialog.trigger")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("createDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("createDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="create-fullName">{t("createDialog.fullName")}</Label>
              <Input
                id="create-fullName"
                placeholder="John Doe"
                value={form.fullName}
                onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">{t("createDialog.email")}</Label>
              <Input
                id="create-email"
                type="email"
                placeholder="john@example.com"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-password">{t("createDialog.password")}</Label>
            <Input
              id="create-password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-phone">{t("createDialog.phoneOptional")}</Label>
            <div dir="ltr" className="flex rounded-md border border-input overflow-hidden">
              <span className="inline-flex items-center px-3 text-sm text-muted-foreground border-e border-input bg-muted/30">
                +966
              </span>
              <Input
                id="create-phone"
                type="tel"
                inputMode="numeric"
                maxLength={9}
                placeholder="501234567"
                value={form.phone ?? ""}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
                aria-invalid={!!phoneError}
              />
            </div>
            {phoneError && <p className="text-xs text-destructive font-medium">{phoneError}</p>}
          </div>
          <div className="space-y-2">
            <Label>{t("createDialog.roleOptional")}</Label>
            <Select
              value={form.roleId || "none"}
              onValueChange={(value) =>
                setForm((p) => ({ ...p, roleId: value === "none" ? "" : value }))
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={rolesLoading ? t("createDialog.loadingRoles") : t("createDialog.selectRolePlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("createDialog.none")}</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={String(role.id)}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("createDialog.stations")}</Label>
            {branchesLoading ? (
              <p className="text-sm text-muted-foreground">{t("createDialog.stationsLoading")}</p>
            ) : branchesFailed ? (
              <div className="flex items-center gap-3 text-sm text-destructive" role="alert">
                <span>{t("createDialog.stationsLoadFailed")}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => refetchBranches()}>
                  {t("createDialog.stationsRetry")}
                </Button>
              </div>
            ) : branches.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("createDialog.stationsEmpty")}</p>
            ) : (
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-input p-2">
                {branches.map((b) => (
                  <label key={b.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted/50">
                    <Checkbox
                      checked={form.branchIds.includes(b.id)}
                      onCheckedChange={(v) =>
                        setForm((p) => ({
                          ...p,
                          branchIds: v ? [...p.branchIds, b.id] : p.branchIds.filter((x) => x !== b.id),
                        }))
                      }
                    />
                    <span>{getBranchDisplayName(b, i18n.language)}</span>
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">{t("createDialog.stationsHint")}</p>
            {form.branchIds.length === 0 && !branchesLoading && !branchesFailed && branches.length > 0 && (
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400" role="status">
                {t("createDialog.stationsNoneWarning")}
              </p>
            )}
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("createDialog.cancel")}
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? t("createDialog.creating") : t("createDialog.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
