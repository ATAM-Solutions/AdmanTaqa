import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useResetAdminUserPassword } from "@/hooks/AdminOrganizations/useAdminUsers";
import { getApiErrorMessage } from "@/lib/utils";
import type { AdminUser } from "@/types/adminOrganization";
import { generatePassword } from "./password";

interface ResetPasswordValues {
  password: string;
  confirmPassword: string;
}

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: number;
  user: AdminUser | null;
}

/** SUPER_ADMIN sets a new password for a company user. The password is never echoed back after success. */
export function ResetPasswordDialog({ open, onOpenChange, organizationId, user }: ResetPasswordDialogProps) {
  const { t } = useTranslation("adminOrganizations");
  const mutation = useResetAdminUserPassword();
  const [showPassword, setShowPassword] = useState(false);

  const schema = useMemo(
    () =>
      z
        .object({
          password: z.string().min(8, t("validation.passwordMin")).max(128, t("validation.maxLength", { max: 128 })),
          confirmPassword: z.string(),
        })
        .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: t("validation.passwordMatch") }),
    [t]
  );

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (open) form.reset({ password: "", confirmPassword: "" });
  }, [open, form]);

  const handleOpenChange = (next: boolean) => {
    if (!next) setShowPassword(false);
    onOpenChange(next);
  };

  const submit = (values: ResetPasswordValues) => {
    if (!user) return;
    mutation.mutate(
      { organizationId, userId: user.id, password: values.password },
      {
        onSuccess: () => {
          toast.success(t("toasts.passwordReset"));
          form.reset({ password: "", confirmPassword: "" });
          handleOpenChange(false);
        },
        onError: (err) => toast.error(getApiErrorMessage(err, t("toasts.error"))),
      }
    );
  };

  const fillGenerated = () => {
    const pwd = generatePassword();
    form.setValue("password", pwd, { shouldValidate: true });
    form.setValue("confirmPassword", pwd, { shouldValidate: true });
    setShowPassword(true);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!mutation.isPending ? handleOpenChange(next) : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("form.resetPassword.title")}</DialogTitle>
          <DialogDescription>{t("form.resetPassword.description", { name: user?.fullName ?? "" })}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id="reset-password-form" onSubmit={form.handleSubmit(submit)} className="space-y-4" autoComplete="off">
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("form.resetPassword.newPassword")}</FormLabel>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <FormControl>
                      <Input type={showPassword ? "text" : "password"} dir="ltr" autoComplete="new-password" className="pe-10" {...field} />
                    </FormControl>
                    <button
                      type="button"
                      className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? t("form.user.hidePassword") : t("form.user.showPassword")}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button type="button" variant="outline" onClick={fillGenerated} title={t("form.user.generatePassword")}>
                    <Wand2 className="h-4 w-4" />
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="confirmPassword" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("form.resetPassword.confirmPassword")}</FormLabel>
                <FormControl>
                  <Input type={showPassword ? "text" : "password"} dir="ltr" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </form>
        </Form>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={mutation.isPending}>
            {t("actions.cancel")}
          </Button>
          <Button type="submit" form="reset-password-form" disabled={mutation.isPending || !user}>
            {mutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
            {mutation.isPending ? t("form.resetPassword.submitting") : t("form.resetPassword.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
