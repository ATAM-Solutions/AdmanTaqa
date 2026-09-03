import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { AlertCircle, Eye, EyeOff, Loader2, ShieldCheck, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useCreateAdminUser, useGetAdminOrganizationRoles, useUpdateAdminUser } from "@/hooks/AdminOrganizations/useAdminUsers";
import { getApiErrorMessage } from "@/lib/utils";
import type { AdminUser, CreateAdminUserBody, UpdateAdminUserBody } from "@/types/adminOrganization";
import { generatePassword } from "./password";

interface UserFormValues {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  roleId: number | null;
  isActive: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 12 chars, mixed case + digits + a symbol — readable, no ambiguous glyphs. */

function userToValues(user: AdminUser | null | undefined): UserFormValues {
  return {
    fullName: user?.fullName ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    password: "",
    confirmPassword: "",
    roleId: user?.roles?.[0]?.id ?? null,
    isActive: user?.isActive ?? true,
  };
}

interface CompanyUserFormProps {
  organizationId: number;
  user?: AdminUser | null;
  defaultCompanyAdmin?: boolean;
  onSaved?: (user: AdminUser, plainPassword?: string) => void;
  onCancel?: () => void;
  submitLabel?: string;
  formId?: string;
  hideActions?: boolean;
  /** Extra hint shown above the inline API error (e.g. wizard retry guidance). */
  errorHint?: string;
  /** Called when the form becomes busy/idle so an external footer can disable itself. */
  onBusyChange?: (busy: boolean) => void;
}

/**
 * Inline user form (create / edit) — used by CompanyUserFormDialog and rendered
 * directly by the Add Company wizard's "Company Admin" step.
 */
export function CompanyUserForm({
  organizationId,
  user,
  defaultCompanyAdmin = false,
  onSaved,
  onCancel,
  submitLabel,
  formId = "company-user-form",
  hideActions = false,
  errorHint,
  onBusyChange,
}: CompanyUserFormProps) {
  const { t } = useTranslation("adminOrganizations");
  const isEdit = !!user;
  const createMutation = useCreateAdminUser();
  const updateMutation = useUpdateAdminUser();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const { data: roles = [], isLoading: loadingRoles } = useGetAdminOrganizationRoles(organizationId);
  const sortedRoles = useMemo(
    () => [...roles].sort((a, b) => (a.isCompanyAdmin === b.isCompanyAdmin ? a.name.localeCompare(b.name) : a.isCompanyAdmin ? -1 : 1)),
    [roles]
  );

  useEffect(() => {
    onBusyChange?.(isSubmitting);
  }, [isSubmitting, onBusyChange]);

  const schema = useMemo(
    () =>
      z
        .object({
          fullName: z.string().trim().min(1, t("validation.required")).max(255, t("validation.maxLength", { max: 255 })),
          email: z
            .string()
            .trim()
            .min(1, t("validation.required"))
            .max(255, t("validation.maxLength", { max: 255 }))
            .refine((v) => EMAIL_RE.test(v), { message: t("validation.email") }),
          phone: z.string().trim().max(50, t("validation.maxLength", { max: 50 })),
          password: z.string(),
          confirmPassword: z.string(),
          roleId: z
            .number()
            .int()
            .positive()
            .nullable()
            .refine((v) => v != null, { message: t("validation.selectRole") }),
          isActive: z.boolean(),
        })
        .superRefine((data, ctx) => {
          if (isEdit) return;
          if (data.password.length < 8) {
            ctx.addIssue({ code: "custom", path: ["password"], message: t("validation.passwordMin") });
          } else if (data.password.length > 128) {
            ctx.addIssue({ code: "custom", path: ["password"], message: t("validation.maxLength", { max: 128 }) });
          }
          if (data.password !== data.confirmPassword) {
            ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: t("validation.passwordMatch") });
          }
        }),
    [t, isEdit]
  );

  const form = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: userToValues(user),
  });

  // Preselect the company-admin role for the wizard / "Add company admin" flows.
  const roleId = form.watch("roleId");
  useEffect(() => {
    if (!isEdit && defaultCompanyAdmin && roleId == null && sortedRoles.length) {
      const admin = sortedRoles.find((r) => r.isCompanyAdmin);
      if (admin) form.setValue("roleId", admin.id, { shouldDirty: true });
    }
  }, [isEdit, defaultCompanyAdmin, roleId, sortedRoles, form]);

  const selectedRole = sortedRoles.find((r) => r.id === roleId);

  const submit = (values: UserFormValues) => {
    setApiError(null);
    if (isEdit && user) {
      const body: UpdateAdminUserBody = {};
      if (values.fullName.trim() !== user.fullName) body.fullName = values.fullName.trim();
      if (values.email.trim().toLowerCase() !== user.email.toLowerCase()) body.email = values.email.trim();
      const phone = values.phone.trim() === "" ? null : values.phone.trim();
      if (phone !== (user.phone ?? null)) body.phone = phone;
      if (values.roleId != null && values.roleId !== (user.roles?.[0]?.id ?? null)) body.roleId = values.roleId;
      if (values.isActive !== user.isActive) body.isActive = values.isActive;
      if (Object.keys(body).length === 0) {
        toast.info(t("toasts.noChanges"));
        return;
      }
      updateMutation.mutate(
        { organizationId, userId: user.id, body },
        {
          onSuccess: (saved) => {
            toast.success(t("toasts.userUpdated"));
            onSaved?.(saved);
          },
          onError: (err) => {
            const msg = getApiErrorMessage(err, t("toasts.error"));
            setApiError(msg);
            toast.error(msg);
          },
        }
      );
      return;
    }
    const body: CreateAdminUserBody = {
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim() === "" ? null : values.phone.trim(),
      password: values.password,
      roleId: values.roleId as number,
      isActive: values.isActive,
    };
    createMutation.mutate(
      { organizationId, body },
      {
        onSuccess: (saved) => {
          toast.success(t("toasts.userCreated"));
          onSaved?.(saved, values.password);
        },
        onError: (err) => {
          const msg = getApiErrorMessage(err, t("toasts.error"));
          setApiError(msg);
          toast.error(msg);
        },
      }
    );
  };

  const fillGenerated = () => {
    const pwd = generatePassword();
    form.setValue("password", pwd, { shouldDirty: true, shouldValidate: true });
    form.setValue("confirmPassword", pwd, { shouldDirty: true, shouldValidate: true });
    setShowPassword(true);
  };

  return (
    <Form {...form}>
      <form id={formId} onSubmit={form.handleSubmit(submit)} className="space-y-5" autoComplete="off">
        {apiError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {errorHint ? <p className="mb-1 font-medium">{errorHint}</p> : null}
              {apiError}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField control={form.control} name="fullName" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("form.user.fullName")} *</FormLabel>
              <FormControl><Input autoComplete="off" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("form.user.email")} *</FormLabel>
              <FormControl><Input type="email" dir="ltr" autoComplete="off" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("form.user.phoneOptional")}</FormLabel>
              <FormControl><Input type="tel" dir="ltr" autoComplete="off" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="roleId" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("form.user.role")} *</FormLabel>
              <Select
                value={field.value != null ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(v ? Number(v) : null)}
                disabled={loadingRoles}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingRoles ? t("form.user.rolesLoading") : t("form.user.rolePlaceholder")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {sortedRoles.length === 0 && !loadingRoles ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">{t("form.user.rolesEmpty")}</div>
                  ) : null}
                  {sortedRoles.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.isCompanyAdmin ? `${r.name} — ${t("roles.companyAdmin")}` : r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedRole?.isCompanyAdmin ? (
                <FormDescription className="flex items-start gap-1.5">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>{t("roles.companyAdminHint")}</span>
                </FormDescription>
              ) : null}
              <FormMessage />
            </FormItem>
          )} />

          {!isEdit ? (
            <>
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.user.password")} *</FormLabel>
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
                      <Wand2 className="h-4 w-4 md:me-2" />
                      <span className="hidden md:inline">{t("form.user.generatePassword")}</span>
                    </Button>
                  </div>
                  <FormDescription>{t("form.user.passwordHint")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.user.confirmPassword")} *</FormLabel>
                  <FormControl>
                    <Input type={showPassword ? "text" : "password"} dir="ltr" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </>
          ) : null}

          <FormField control={form.control} name="isActive" render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border px-3 py-2 md:col-span-2">
              <FormLabel className="font-normal">{t("form.user.active")}</FormLabel>
              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
            </FormItem>
          )} />
        </div>

        {!hideActions ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {onCancel ? (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                {t("actions.cancel")}
              </Button>
            ) : null}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
              {submitLabel ?? (isEdit ? t("actions.save") : t("actions.create"))}
            </Button>
          </div>
        ) : null}
      </form>
    </Form>
  );
}

interface CompanyUserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: number;
  user?: AdminUser | null;
  defaultCompanyAdmin?: boolean;
  onSaved?: (user: AdminUser, plainPassword?: string) => void;
}

/** Create (user null) or edit a user of one company. */
export function CompanyUserFormDialog({ open, onOpenChange, organizationId, user, defaultCompanyAdmin, onSaved }: CompanyUserFormDialogProps) {
  const { t } = useTranslation("adminOrganizations");
  const [busy, setBusy] = useState(false);
  const isEdit = !!user;

  return (
    <Dialog open={open} onOpenChange={(next) => (!busy ? onOpenChange(next) : undefined)}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("form.user.editTitle") : t("form.user.createTitle")}</DialogTitle>
          <DialogDescription>{t("form.user.description")}</DialogDescription>
        </DialogHeader>
        {open ? (
          <CompanyUserForm
            key={user?.id ?? "new"}
            organizationId={organizationId}
            user={user}
            defaultCompanyAdmin={defaultCompanyAdmin}
            formId="company-user-dialog-form"
            hideActions
            onBusyChange={setBusy}
            onSaved={(saved, plainPassword) => {
              onSaved?.(saved, plainPassword);
              onOpenChange(false);
            }}
          />
        ) : null}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t("actions.cancel")}
          </Button>
          <Button type="submit" form="company-user-dialog-form" disabled={busy}>
            {busy ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
            {isEdit ? t("actions.save") : t("actions.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
