import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetAdminAssetPolicy, useSetAdminAssetPolicy } from "@/hooks/AdminOrganizations/useAdminAssetPolicy";
import { classifyAssetPolicyError, type AssetPolicyError } from "@/lib/assetPolicy";
import type { AdminOrganizationDetail, SetAssetPolicyBody } from "@/types/adminOrganization";
import { AssetPolicyEditor } from "./AssetPolicyEditor";

interface AssetPermissionsTabProps {
  organization: AdminOrganizationDetail;
}

/** Super Admin → company → "Asset permissions". The backend (Super Admin guard chain) stays the security boundary. */
export function AssetPermissionsTab({ organization }: AssetPermissionsTabProps) {
  const { t } = useTranslation("adminOrganizations");
  const query = useGetAdminAssetPolicy(organization.id);
  const mutation = useSetAdminAssetPolicy(organization.id);
  const [saveError, setSaveError] = useState<string | null>(null);

  const describe = (error: AssetPolicyError) =>
    t(`assetPolicy.errors.${error.kind}`, {
      names: error.unknownRoleNames.length > 0 ? ` (${error.unknownRoleNames.join(", ")})` : "",
    });

  const save = async (body: SetAssetPolicyBody) => {
    setSaveError(null);
    try {
      await mutation.mutateAsync(body);
      toast.success(t("assetPolicy.toasts.saved")); // only reached when the API confirmed the save
    } catch (error) {
      const message = describe(classifyAssetPolicyError(error));
      setSaveError(message);
      toast.error(message);
      throw error;
    }
  };

  if (query.isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    const failure = classifyAssetPolicyError(query.error);
    const retryable = failure.kind === "network" || failure.kind === "server" || failure.kind === "schemaNotReady";
    return (
      <Alert variant="destructive" data-testid="load-error">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {t("assetPolicy.errors.loadFailed")} {describe(failure)}
          </span>
          {retryable ? (
            <Button size="sm" variant="outline" onClick={() => query.refetch()}>
              {t("assetPolicy.retry")}
            </Button>
          ) : null}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <AssetPolicyEditor
      policy={query.data}
      onSave={save}
      isSaving={mutation.isPending}
      saveError={saveError}
      onDismissError={() => setSaveError(null)}
    />
  );
}
