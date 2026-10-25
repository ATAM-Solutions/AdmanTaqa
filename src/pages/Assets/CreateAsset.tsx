import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useCreateAsset } from "@/hooks/Assets/useAssetManagement";
import { buildCreateBody, classifyAssetError, emptyAssetForm, type AssetFormField, type AssetFormValues } from "@/lib/assets";
import AssetForm from "./components/AssetForm";
import { assetErrorMessage } from "./components/assetErrors";

const FORM_FIELDS: AssetFormField[] = ["branchId", "name", "maintenanceType", "description", "type", "manufacturer", "model", "serialNumber", "location", "installationDate", "purchaseDate", "purchaseCost", "warrantyExpiry", "status"];

/** The route guard already requires assets.create; the backend re-checks it (and the station) on submit. */
export default function CreateAsset() {
  const { t } = useTranslation("assets");
  const navigate = useNavigate();
  const { organization } = useAuth();
  const mutation = useCreateAsset();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<AssetFormField, string>>>({});

  const submit = async (values: AssetFormValues) => {
    setError(null);
    setFieldErrors({});
    try {
      const created = await mutation.mutateAsync(buildCreateBody(values));
      toast.success(t("toasts.created")); // only after the API confirmed the creation
      navigate(`/assets/${created.id}`);
    } catch (e) {
      const failure = classifyAssetError(e);
      if (failure.kind === "conflict") {
        setFieldErrors({ serialNumber: t("errors.conflictSerial") }); // the only 409 on this endpoint: duplicate serial number
      } else {
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
        <Button variant="ghost" size="icon" onClick={() => navigate("/assets")} aria-label={t("details.back")}>
          <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("form.createTitle")}</h1>
          <p className="text-muted-foreground">{t("form.createSubtitle")}</p>
        </div>
      </div>
      {/* keyed by company so a typed draft never survives a change of company/account */}
      <AssetForm
        key={organization?.id ?? "none"}
        mode="create"
        initialValues={emptyAssetForm()}
        onSubmit={submit}
        submitting={mutation.isPending}
        onCancel={() => navigate("/assets")}
        error={error}
        fieldErrors={fieldErrors}
      />
    </div>
  );
}
