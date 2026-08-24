import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/api/services/authService";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

function getErrorMessage(err: unknown): string | null {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response;
    return res?.data?.message ?? null;
  }
  return null;
}

export function useLoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
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
        let roles = response.data.roles ?? [];
        let permissions = response.data.permissions ?? [];

        // Prefer /auth/me as the source of permissions after login.
        try {
          const me = await authService.me();
          if (me.success && me.data) {
            roles = me.data.roles ?? roles;
            permissions = me.data.permissions ?? permissions;
          }
        } catch {
          // Keep login flow alive even if /auth/me fails.
        }

        login({
          ...response.data,
          roles,
          permissions,
        });
        toast.success("Welcome back! Login successful");
        const from = (location.state as { from?: { pathname?: string } })?.from?.pathname;
        navigate(from || "/", { replace: true });
      } else {
        const msg = response.message || "Login failed";
        setApiError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = getErrorMessage(err) || "An error occurred during login";
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
