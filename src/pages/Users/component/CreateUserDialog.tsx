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
};

const initialForm: CreateUserForm = {
  email: "",
  fullName: "",
  password: "",
  phone: "",
  roleId: "",
};

type CreateUserDialogProps = {
  /** Optional custom trigger; defaults to "Create New User" button */
  trigger?: React.ReactNode;
};

export default function CreateUserDialog({ trigger }: CreateUserDialogProps) {
  const { t } = useTranslation("users");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [phoneError, setPhoneError] = useState("");
  const createMutation = useCreateUser();
  const { data: roles = [], isLoading: rolesLoading } = useGetRoles();

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
