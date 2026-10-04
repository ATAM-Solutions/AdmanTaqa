import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { getHomePath } from "@/lib/navigation";
import { resolvePostLoginPath } from "@/lib/accessControl";
import { classifyAuthError, retryAfterMinutes } from "@/lib/authErrors";
import { authService } from "@/api/services/authService";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export function useLoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const { t } = useTranslation("auth");
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setApiError(null);
    try {
      const response = await authService.login(data);
      if (response.success && response.data) {
        // Persist the token first — authService.me() goes through the shared axios
        // instance, whose request interceptor reads the token from localStorage,
        // so calling /auth/me before login() writes it there always 401s (the
        // failure was silently swallowed below, so /auth/me's "freshest" roles/
        // permissions were never actually being used).
        login(response.data);

        // Prefer /auth/me as the source of permissions once the token is persisted.
        let sessionPermissions = response.data.permissions ?? [];
        try {
          const me = await authService.me();
          if (me.success && me.data) {
            sessionPermissions = me.data.permissions ?? sessionPermissions;
            login({
              ...response.data,
              roles: me.data.roles ?? response.data.roles,
              permissions: me.data.permissions ?? response.data.permissions,
            });
          }
        } catch {
          // Keep login flow alive even if /auth/me fails — response.data already applied above.
        }
        toast.success(t("login.success"));
        const from = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
        // Land every org type on its own dashboard (SUPER_ADMIN / FUEL_STATION / SERVICE_PROVIDER);
        // Authority has no dashboard variant and keeps landing on its profile. A remembered page
        // is only replayed if THIS user may open it (see resolvePostLoginPath).
        navigate(
          resolvePostLoginPath(
            from,
            response.data.organization?.type,
            sessionPermissions,
            getHomePath(response.data.organization?.type)
          ),
          { replace: true }
        );
      } else {
        const msg = t("login.errors.unknown");
        setApiError(msg);
        toast.error(msg);
      }
    } catch (err) {
      // Branch on status + the backend's stable `code`, never on English message text.
      const { kind, retryAfterSeconds } = classifyAuthError(err);
      const minutes = retryAfterMinutes(retryAfterSeconds);
      const msg =
        kind === "rate_limited" && minutes
          ? t("login.errors.rate_limited_minutes", { count: minutes })
          : t(`login.errors.${kind}`);
      setApiError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    ...form,
    submitForm: form.handleSubmit(onSubmit),
    isLoading,
    apiError,
  };
}
