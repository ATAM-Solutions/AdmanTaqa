import { useId, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import BranchSelect from "@/components/BranchSelect";
import useGetBranches from "@/hooks/Branches/useGetBranches";
import { validateAssetForm, type AssetFormField, type AssetFormValues, type FieldError, type FieldErrors } from "@/lib/assets";
import { ASSET_STATUSES, MAINTENANCE_TYPES, type MaintenanceType, type AssetStatus } from "@/types/asset";

export interface AssetFormProps {
  mode: "create" | "edit";
  initialValues: AssetFormValues;
  /** Edit only: the station the asset already belongs to (it cannot be changed). */
  stationName?: string;
  /** Persist; must reject when the API does not confirm. The page reports the failure through `error` / `fieldErrors`. */
  onSubmit: (values: AssetFormValues) => Promise<unknown>;
  submitting: boolean;
  onCancel: () => void;
  /** Translated message for a failed save (shown above the buttons). */
  error?: string | null;
  /** Fields the server rejected (message already translated), e.g. the duplicate serial number. */
  fieldErrors?: Partial<Record<AssetFormField, string>>;
  /** Edit only: shown when the form has no changes to save. */
  notice?: string | null;
}

function Field({ id, label, required, error, hint, children }: { id: string; label: string; required?: boolean; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="ms-1 text-destructive" aria-hidden="true">*</span> : null}
      </Label>
      {children}
      {hint && !error ? <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  );
}

/**
 * The asset form shared by "Add asset" and "Edit asset". Validation mirrors the backend schema before anything is sent;
 * the server stays the authority (duplicate serial numbers, station scope, permissions).
 */
export default function AssetForm({ mode, initialValues, stationName, onSubmit, submitting, onCancel, error, fieldErrors, notice }: AssetFormProps) {
  const { t } = useTranslation("assets");
  const uid = useId();
  const [values, setValues] = useState<AssetFormValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors<AssetFormField>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const { data: branches = [] } = useGetBranches();
  const id = (field: AssetFormField) => `${uid}-${field}`;

  const set = <K extends AssetFormField>(field: K, value: AssetFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };
  const message = (e: FieldError | undefined) => (e ? t(`validation.${e.key}`, { max: e.max }) : undefined);
  // a client-side message wins; otherwise what the server said about the field
  const errorFor = (field: AssetFormField) => message(errors[field]) ?? fieldErrors?.[field];
  const aria = (field: AssetFormField, hint?: boolean) => ({
    "aria-invalid": errorFor(field) ? true : undefined,
    "aria-describedby": errorFor(field) ? `${id(field)}-error` : hint ? `${id(field)}-hint` : undefined,
  });

  const focusFirstError = (found: FieldErrors<AssetFormField>) => {
    const first = (Object.keys(found) as AssetFormField[])[0];
    if (first) formRef.current?.querySelector<HTMLElement>(`#${CSS.escape(id(first))}`)?.focus();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    const found = validateAssetForm(values, { mode, allowedBranchIds: branches.map((b) => b.id) });
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstError(found);
      return;
    }
    try {
      await onSubmit(values);
    } catch {
      // the page already reported it (error / fieldErrors); the typed values stay
    }
  };

  const createBlocked = mode === "create" && branches.length === 0;
  const text = (field: AssetFormField, props: { type?: string; inputMode?: "decimal"; placeholder?: string; dir?: "ltr" } = {}) => (
    <Input
      id={id(field)}
      value={values[field]}
      onChange={(e) => set(field, e.target.value as never)}
      disabled={submitting}
      {...props}
      {...aria(field, field === "serialNumber" || field === "maintenanceType")}
    />
  );

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-6" data-testid="asset-form">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("form.sections.basic")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field id={id("branchId")} label={t("form.fields.branchId")} required={mode === "create"} error={errorFor("branchId")} hint={mode === "edit" ? t("form.stationLocked") : undefined}>
            {mode === "create" ? (
              <BranchSelect id={id("branchId")} value={values.branchId} onValueChange={(v) => set("branchId", v)} disabled={submitting} />
            ) : (
              <p id={id("branchId")} className="rounded-md border bg-muted/40 px-3 py-2 text-sm" dir="auto" data-testid="station-readonly">
                {stationName || "—"}
              </p>
            )}
          </Field>
          <Field id={id("name")} label={t("form.fields.name")} required error={errorFor("name")}>
            {text("name")}
          </Field>
          <Field id={id("maintenanceType")} label={t("form.fields.maintenanceType")} required error={errorFor("maintenanceType")} hint={t("form.maintenanceHint")}>
            <Select value={values.maintenanceType} onValueChange={(v) => set("maintenanceType", v as MaintenanceType)} disabled={submitting}>
              <SelectTrigger id={id("maintenanceType")} {...aria("maintenanceType", true)}>
                <SelectValue placeholder={t("form.placeholders.maintenanceType")} />
              </SelectTrigger>
              <SelectContent>
                {MAINTENANCE_TYPES.map((m) => (
                  <SelectItem key={m} value={m}>{t(`maintenanceType.${m}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id={id("status")} label={t("form.fields.status")} error={errorFor("status")}>
            <Select value={values.status} onValueChange={(v) => set("status", v as AssetStatus)} disabled={submitting}>
              <SelectTrigger id={id("status")} {...aria("status")}>
                <SelectValue placeholder={t("form.placeholders.status")} />
              </SelectTrigger>
              <SelectContent>
                {ASSET_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{t(`status.${s}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="md:col-span-2">
            <Field id={id("description")} label={t("form.fields.description")} error={errorFor("description")}>
              <Textarea id={id("description")} rows={3} value={values.description} onChange={(e) => set("description", e.target.value)} disabled={submitting} {...aria("description")} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("form.sections.details")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field id={id("type")} label={t("form.fields.type")} error={errorFor("type")}>{text("type")}</Field>
          <Field id={id("manufacturer")} label={t("form.fields.manufacturer")} error={errorFor("manufacturer")}>{text("manufacturer")}</Field>
          <Field id={id("model")} label={t("form.fields.model")} error={errorFor("model")}>{text("model")}</Field>
          <Field id={id("serialNumber")} label={t("form.fields.serialNumber")} error={errorFor("serialNumber")} hint={t("form.serialHint")}>
            {text("serialNumber", { dir: "ltr" })}
          </Field>
          <Field id={id("location")} label={t("form.fields.location")} error={errorFor("location")}>{text("location")}</Field>
          <Field id={id("installationDate")} label={t("form.fields.installationDate")} error={errorFor("installationDate")}>
            {text("installationDate", { type: "date", dir: "ltr" })}
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("form.sections.purchase")}</CardTitle>
          <CardDescription className="sr-only">{t("form.sections.purchase")}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field id={id("purchaseDate")} label={t("form.fields.purchaseDate")} error={errorFor("purchaseDate")}>
            {text("purchaseDate", { type: "date", dir: "ltr" })}
          </Field>
          <Field id={id("purchaseCost")} label={t("form.fields.purchaseCost")} error={errorFor("purchaseCost")}>
            {text("purchaseCost", { inputMode: "decimal", placeholder: t("form.placeholders.purchaseCost"), dir: "ltr" })}
          </Field>
          <Field id={id("warrantyExpiry")} label={t("form.fields.warrantyExpiry")} error={errorFor("warrantyExpiry")}>
            {text("warrantyExpiry", { type: "date", dir: "ltr" })}
          </Field>
        </CardContent>
      </Card>

      {createBlocked ? (
        <Alert data-testid="no-stations">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{t("form.noStations")}</AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive" data-testid="form-error">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {notice ? <p className="text-sm text-muted-foreground" role="status" data-testid="form-notice">{notice}</p> : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          {t("form.cancel")}
        </Button>
        <Button type="submit" disabled={submitting || createBlocked} className="gap-2" data-testid="asset-submit">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitting ? t("form.submitting") : mode === "create" ? t("form.submitCreate") : t("form.submitEdit")}
        </Button>
      </div>
    </form>
  );
}
