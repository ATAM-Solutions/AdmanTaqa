import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetAdminPermissionPolicy, useSetAdminPermissionPolicy } from "@/hooks/AdminOrganizations/useAdminPermissionPolicy";
import { classifyPermissionPolicyError, type PermissionPolicyError } from "@/lib/permissionPolicy";
import type { AdminOrganizationDetail, PermissionPolicyEntry } from "@/types/adminOrganization";
import { PermissionPolicyEditor } from "./PermissionPolicyEditor";

interface PermissionPolicyTabProps {
  organization: AdminOrganizationDetail;
}

/** Super Admin → company → "Job title permissions". The backend (Super Admin guard chain) stays the security boundary. */
export function PermissionPolicyTab({ organization }: PermissionPolicyTabProps) {
  const { t } = useTranslation("adminOrganizations");
  const query = useGetAdminPermissionPolicy(organization.id);
  const mutation = useSetAdminPermissionPolicy(organization.id);
  const [saveError, setSaveError] = useState<string | null>(null);

  const describe = (error: PermissionPolicyError) =>
    t(`permissionPolicy.errors.${error.kind}`, { names: error.names.length > 0 ? ` (${error.names.join(", ")})` : "" });

  const save = async (policies: PermissionPolicyEntry[]) => {
    setSaveError(null);
    try {
      await mutation.mutateAsync({ policies });
      toast.success(t("permissionPolicy.saved")); // only reached when the API confirmed the save
    } catch (error) {
      const message = describe(classifyPermissionPolicyError(error));
      setSaveError(message);
      toast.error(message);
      throw error;
    }
  };

  if (query.isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" data-testid="policy-loading">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    const failure = classifyPermissionPolicyError(query.error);
    const retryable = failure.kind === "network" || failure.kind === "server" || failure.kind === "schemaNotReady";
    return (
      <Alert variant="destructive" data-testid="load-error">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {t("permissionPolicy.loadFailed")} {describe(failure)}
          </span>
          {retryable ? (
            <Button size="sm" variant="outline" onClick={() => query.refetch()}>
              {t("permissionPolicy.retry")}
            </Button>
          ) : null}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <PermissionPolicyEditor
      policy={query.data}
      onSave={save}
      isSaving={mutation.isPending}
      saveError={saveError}
      onDismissError={() => setSaveError(null)}
    />
  );
}
