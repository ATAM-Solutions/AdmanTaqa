import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ChevronLeft, PackageX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/patterns";
import { useAsset, useUpdateAsset } from "@/hooks/Assets/useAssetManagement";
import { assetToForm, buildUpdateBody, classifyAssetError, hasChanges, isTerminalAssetError, type AssetFormField, type AssetFormValues } from "@/lib/assets";
import { getBranchDisplayName } from "@/lib/company";
import AssetForm from "./components/AssetForm";
import { assetErrorMessage } from "./components/assetErrors";

const FORM_FIELDS: AssetFormField[] = ["name", "maintenanceType", "description", "type", "manufacturer", "model", "serialNumber", "location", "installationDate", "purchaseDate", "purchaseCost", "warrantyExpiry", "status"];

/** The route guard requires assets.update; the backend re-checks it, the company and the station. */
export default function EditAsset() {
  const { t, i18n } = useTranslation("assets");
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const query = useAsset(id);
  const mutation = useUpdateAsset(id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<AssetFormField, string>>>({});

  const back = () => navigate(`/assets/${id}`);
  const asset = query.data;

  if (query.isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-8" aria-busy="true">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (query.isError || !asset) {
    const terminal = isTerminalAssetError(classifyAssetError(query.error).kind);
    return (
      <div className="p-4 md:p-8" data-testid="edit-load-error">
        <EmptyState
          icon={<PackageX className="h-6 w-6" />}
          title={terminal ? t("details.notFoundTitle") : t("errors.loadFailed")}
          description={terminal ? t("details.notFoundDescription") : assetErrorMessage(t, query.error)}
          action={
            <div className="flex gap-2">
              {terminal ? null : <Button variant="outline" onClick={() => query.refetch()}>{t("list.retry")}</Button>}
              <Button asChild variant="outline"><Link to="/assets">{t("details.back")}</Link></Button>
            </div>
          }
        />
      </div>
    );
  }

  const submit = async (values: AssetFormValues) => {
    setError(null);
    setNotice(null);
    setFieldErrors({});
    const body = buildUpdateBody(asset, values);
    if (!hasChanges(body)) {
      setNotice(t("form.noChanges")); // nothing differs from what is saved: no request
      return;
    }
    try {
      await mutation.mutateAsync(body);
      toast.success(t("toasts.updated")); // only after the API confirmed the update
      back();
    } catch (e) {
      const failure = classifyAssetError(e);
      if (failure.kind === "conflict") setFieldErrors({ serialNumber: t("errors.conflictSerial") });
      else {
        setError(assetErrorMessage(t, e));
        if (failure.kind === "validation") {
          const rejected: Partial<Record<AssetFormField, string>> = {};
          for (const f of FORM_FIELDS) if (failure.fieldErrors[f]) rejected[f] = t("errors.fieldRejected");
          setFieldErrors(rejected);
        }
      }
      throw e;
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 animate-in fade-in duration-500 md:p-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={back} aria-label={t("details.back")}>
          <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight" dir="auto">{t("form.editTitle")}</h1>
          <p className="text-muted-foreground" dir="auto">{asset.name}</p>
        </div>
      </div>
      <AssetForm
        key={`${asset.id}-${asset.updatedAt ?? ""}`}
        mode="edit"
        initialValues={assetToForm(asset)}
        stationName={getBranchDisplayName(asset.Branch, i18n.language)}
        onSubmit={submit}
        submitting={mutation.isPending}
        onCancel={back}
        error={error}
        fieldErrors={fieldErrors}
        notice={notice}
      />
    </div>
  );
}
