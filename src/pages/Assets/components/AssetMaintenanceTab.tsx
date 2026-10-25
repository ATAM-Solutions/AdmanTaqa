import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAssetMaintenance, useCreateMaintenance } from "@/hooks/Assets/useAssetManagement";
import { buildMaintenanceBody, formatDateTime, nowLocalInput, validateMaintenanceForm, type AssetCapabilities, type FieldErrors, type MaintenanceFormValues } from "@/lib/assets";
import { FieldMessage, FormFailure, RecordsCard, RecordsState } from "./AssetRecordParts";
import { assetErrorMessage } from "./assetErrors";

export default function AssetMaintenanceTab({ assetId, caps }: { assetId: number | string; caps: AssetCapabilities }) {
  const { t, i18n } = useTranslation("assets");
  const uid = useId();
  const query = useAssetMaintenance(assetId);
  const create = useCreateMaintenance(assetId);
  const [adding, setAdding] = useState(false);
  const [values, setValues] = useState<MaintenanceFormValues>({ performedAt: "", notes: "" });
  const [errors, setErrors] = useState<FieldErrors<keyof MaintenanceFormValues>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const fid = (f: string) => `${uid}-${f}`;
  const msg = (f: keyof MaintenanceFormValues) => (errors[f] ? t(`validation.${errors[f]!.key}`, { max: errors[f]!.max }) : undefined);
  const set = (f: keyof MaintenanceFormValues, v: string) => { setValues((p) => ({ ...p, [f]: v })); setErrors((p) => ({ ...p, [f]: undefined })); };
  const open = () => { setValues({ performedAt: nowLocalInput(), notes: "" }); setAdding(true); };
  const close = () => { setAdding(false); setErrors({}); setFailure(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (create.isPending) return;
    const found = validateMaintenanceForm(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    setFailure(null);
    try {
      await create.mutateAsync(buildMaintenanceBody(values));
      toast.success(t("toasts.maintenanceAdded"));
      close();
    } catch (err) {
      setFailure(assetErrorMessage(t, err));
    }
  };

  return (
    <RecordsCard
      title={t("maintenance.title")}
      description={t("maintenance.description")}
      action={caps.manageRecords && !adding ? (
        <Button size="sm" className="gap-2" onClick={open} data-testid="add-maintenance"><Plus className="h-4 w-4" />{t("maintenance.add")}</Button>
      ) : undefined}
    >
      {adding ? (
        <form onSubmit={submit} noValidate className="space-y-4 rounded-lg border p-4" data-testid="maintenance-form">
          <div className="space-y-1.5 sm:max-w-xs">
            <Label htmlFor={fid("at")}>{t("maintenance.fields.performedAt")} <span className="text-destructive" aria-hidden="true">*</span></Label>
            <Input id={fid("at")} type="datetime-local" dir="ltr" value={values.performedAt} onChange={(e) => set("performedAt", e.target.value)} disabled={create.isPending}
              aria-invalid={msg("performedAt") ? true : undefined} aria-describedby={msg("performedAt") ? `${fid("at")}-error` : undefined} />
            <FieldMessage id={fid("at")} text={msg("performedAt")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={fid("notes")}>{t("maintenance.fields.notes")}</Label>
            <Textarea id={fid("notes")} rows={3} value={values.notes} onChange={(e) => set("notes", e.target.value)} placeholder={t("maintenance.placeholders.notes")} disabled={create.isPending}
              aria-invalid={msg("notes") ? true : undefined} aria-describedby={msg("notes") ? `${fid("notes")}-error` : undefined} />
            <FieldMessage id={fid("notes")} text={msg("notes")} />
          </div>
          <FormFailure message={failure} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={close} disabled={create.isPending}>{t("maintenance.cancel")}</Button>
            <Button type="submit" disabled={create.isPending} data-testid="maintenance-submit">{create.isPending ? t("maintenance.adding") : t("maintenance.add")}</Button>
          </div>
        </form>
      ) : null}
      <RecordsState query={query} emptyText={t("maintenance.empty")}>
        {(items) => (
          <ul className="divide-y rounded-lg border" data-testid="maintenance-list">
            {items.map((m) => (
              <li key={m.id} className="space-y-1 p-3" data-testid={`maintenance-${m.id}`}>
                <p className="flex flex-wrap items-center gap-x-3 text-sm font-medium">
                  <span>{formatDateTime(m.performedAt, i18n.language)}</span>
                  <span className="text-muted-foreground" dir="auto">{t("maintenance.performedBy", { name: m.performedByName ?? t("maintenance.unknownUser") })}</span>
                </p>
                {m.notes ? <p className="whitespace-pre-wrap text-sm text-muted-foreground" dir="auto">{m.notes}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </RecordsState>
    </RecordsCard>
  );
}
