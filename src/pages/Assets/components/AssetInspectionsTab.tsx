import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAssetInspections, useCreateInspection } from "@/hooks/Assets/useAssetManagement";
import { buildInspectionBody, formatDateOnly, validateInspectionForm, type AssetCapabilities, type FieldErrors, type InspectionFormValues } from "@/lib/assets";
import { FieldMessage, FormFailure, RecordsCard, RecordsState } from "./AssetRecordParts";
import { assetErrorMessage } from "./assetErrors";

const EMPTY: InspectionFormValues = { inspectionDate: "", status: "", notes: "" };

export default function AssetInspectionsTab({ assetId, caps }: { assetId: number | string; caps: AssetCapabilities }) {
  const { t, i18n } = useTranslation("assets");
  const uid = useId();
  const query = useAssetInspections(assetId);
  const create = useCreateInspection(assetId);
  const [adding, setAdding] = useState(false);
  const [values, setValues] = useState<InspectionFormValues>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors<keyof InspectionFormValues>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const fid = (f: string) => `${uid}-${f}`;
  const msg = (f: keyof InspectionFormValues) => (errors[f] ? t(`validation.${errors[f]!.key}`, { max: errors[f]!.max }) : undefined);
  const set = (f: keyof InspectionFormValues, v: string) => { setValues((p) => ({ ...p, [f]: v })); setErrors((p) => ({ ...p, [f]: undefined })); };
  const close = () => { setAdding(false); setValues(EMPTY); setErrors({}); setFailure(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (create.isPending) return;
    const found = validateInspectionForm(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    setFailure(null);
    try {
      await create.mutateAsync(buildInspectionBody(values));
      toast.success(t("toasts.inspectionAdded"));
      close();
    } catch (err) {
      setFailure(assetErrorMessage(t, err));
    }
  };

  return (
    <RecordsCard
      title={t("inspections.title")}
      description={t("inspections.description")}
      action={caps.manageRecords && !adding ? (
        <Button size="sm" className="gap-2" onClick={() => setAdding(true)} data-testid="add-inspection"><Plus className="h-4 w-4" />{t("inspections.add")}</Button>
      ) : undefined}
    >
      {adding ? (
        <form onSubmit={submit} noValidate className="space-y-4 rounded-lg border p-4" data-testid="inspection-form">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={fid("date")}>{t("inspections.fields.inspectionDate")} <span className="text-destructive" aria-hidden="true">*</span></Label>
              <Input id={fid("date")} type="date" dir="ltr" value={values.inspectionDate} onChange={(e) => set("inspectionDate", e.target.value)} disabled={create.isPending}
                aria-invalid={msg("inspectionDate") ? true : undefined} aria-describedby={msg("inspectionDate") ? `${fid("date")}-error` : undefined} />
              <FieldMessage id={fid("date")} text={msg("inspectionDate")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={fid("status")}>{t("inspections.fields.status")}</Label>
              <Input id={fid("status")} value={values.status} onChange={(e) => set("status", e.target.value)} placeholder={t("inspections.placeholders.status")} disabled={create.isPending}
                aria-invalid={msg("status") ? true : undefined} aria-describedby={msg("status") ? `${fid("status")}-error` : undefined} />
              <FieldMessage id={fid("status")} text={msg("status")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={fid("notes")}>{t("inspections.fields.notes")}</Label>
            <Textarea id={fid("notes")} rows={3} value={values.notes} onChange={(e) => set("notes", e.target.value)} placeholder={t("inspections.placeholders.notes")} disabled={create.isPending}
              aria-invalid={msg("notes") ? true : undefined} aria-describedby={msg("notes") ? `${fid("notes")}-error` : undefined} />
            <FieldMessage id={fid("notes")} text={msg("notes")} />
          </div>
          <FormFailure message={failure} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={close} disabled={create.isPending}>{t("inspections.cancel")}</Button>
            <Button type="submit" disabled={create.isPending} data-testid="inspection-submit">{create.isPending ? t("inspections.adding") : t("inspections.add")}</Button>
          </div>
        </form>
      ) : null}
      <RecordsState query={query} emptyText={t("inspections.empty")}>
        {(items) => (
          <ul className="divide-y rounded-lg border" data-testid="inspections-list">
            {items.map((i) => (
              <li key={i.id} className="space-y-1 p-3" data-testid={`inspection-${i.id}`}>
                <p className="flex flex-wrap items-center gap-x-3 text-sm font-medium">
                  <span>{formatDateOnly(i.inspectionDate, i18n.language)}</span>
                  <span className="text-muted-foreground" dir="auto">{i.status || t("inspections.noStatus")}</span>
                </p>
                {i.notes ? <p className="whitespace-pre-wrap text-sm text-muted-foreground" dir="auto">{i.notes}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </RecordsState>
    </RecordsCard>
  );
}
