import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAssetWarranties, useCreateWarranty, useUpdateWarranty, useWarrantyProviders } from "@/hooks/Assets/useAssetManagement";
import {
  buildWarrantyBody, buildWarrantyUpdate, classifyAssetError, formatDateOnly, validateWarrantyForm, warrantyProviderChoices, warrantyProviderName,
  warrantyStatus, warrantyToEditValues, type AssetCapabilities, type FieldErrors, type WarrantyEditValues, type WarrantyFormValues, type WarrantyProviderChoice,
} from "@/lib/assets";
import type { WarrantyRecord } from "@/types/asset";
import { FieldMessage, FormFailure, RecordsCard, RecordsState } from "./AssetRecordParts";
import { assetErrorMessage } from "./assetErrors";

const EMPTY: WarrantyFormValues = { providerOrganizationId: "", startDate: "", endDate: "" };
const STATUS_STYLE = {
  upcoming: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  active: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  expired: "border-border bg-muted text-muted-foreground",
} as const;
const STATE_STYLE = "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300";

export default function AssetWarrantiesTab({ assetId, caps }: { assetId: number | string; caps: AssetCapabilities }) {
  const { t, i18n } = useTranslation("assets");
  const uid = useId();
  const lang = i18n.language;
  const query = useAssetWarranties(assetId);
  const create = useCreateWarranty(assetId);
  const update = useUpdateWarranty(assetId);

  const [adding, setAdding] = useState(false);
  const [values, setValues] = useState<WarrantyFormValues>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors<keyof WarrantyFormValues>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [editing, setEditing] = useState<WarrantyRecord | null>(null);
  const [editValues, setEditValues] = useState<WarrantyEditValues>({ providerOrganizationId: "", startDate: "", endDate: "" });
  const [editErrors, setEditErrors] = useState<FieldErrors<"startDate" | "endDate">>({});
  const [editFailure, setEditFailure] = useState<string | null>(null);

  // The eligible providers of THIS asset's company, from the API that needs only assets.read. Fetched only while a form that
  // uses it is open and refetched on every open, so the choices are never older than the form.
  const providers = useWarrantyProviders(assetId, adding || editing != null);
  const eligible = providers.data ?? [];

  const fid = (f: string) => `${uid}-${f}`;
  const msg = (e: FieldErrors<string>, f: string) => (e[f] ? t(`validation.${e[f]!.key}`, { max: e[f]!.max }) : undefined);
  const canPickProvider = providers.isSuccess && eligible.length > 0;
  const close = () => { setAdding(false); setValues(EMPTY); setErrors({}); setFailure(null); };

  /** Name + state of a warranty's provider as the API reports it; an unavailable provider never shows a name or an id. */
  const providerView = (w: WarrantyRecord) => {
    const p = w.provider;
    if (!p) return { text: t("warranties.providerFallback", { id: w.providerOrganizationId }), state: null };
    const name = warrantyProviderName(p, lang);
    if (p.state === "UNAVAILABLE" || !name) return { text: t("warranties.providerUnavailable"), state: "UNAVAILABLE" as const };
    return { text: name, state: p.state };
  };
  const choiceLabel = (c: WarrantyProviderChoice) => {
    const name = warrantyProviderName(c, lang) ?? t("warranties.providerUnavailable");
    if (c.historicalState) return `${name} — ${t(`warranties.states.${c.historicalState}`)} ${t("warranties.currentSuffix")}`;
    return c.isCurrent ? `${name} ${t("warranties.currentSuffix")}` : name;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (create.isPending) return;
    const found = validateWarrantyForm(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    setFailure(null);
    try {
      await create.mutateAsync(buildWarrantyBody(values));
      toast.success(t("toasts.warrantyAdded"));
      close();
    } catch (err) {
      const kind = classifyAssetError(err).kind;
      if (kind === "warrantyProvider") {
        // The server no longer accepts this provider: say so on the field, drop the stale choice and reload the list.
        setErrors((p) => ({ ...p, providerOrganizationId: { key: "providerNotEligible" } }));
        setValues((p) => ({ ...p, providerOrganizationId: "" }));
        void providers.refetch();
      } else {
        setFailure(assetErrorMessage(t, err));
      }
    }
  };

  const openEdit = (w: WarrantyRecord) => {
    setEditing(w);
    setEditValues(warrantyToEditValues(w));
    setEditErrors({});
    setEditFailure(null);
  };
  const changes = editing ? buildWarrantyUpdate(editing, editValues) : null;
  const submitEdit = async () => {
    if (!editing || update.isPending) return;
    const found = validateWarrantyForm({ ...editValues }, { providerRequired: false });
    setEditErrors(found as FieldErrors<"startDate" | "endDate">);
    if (Object.keys(found).length) return;
    const body = buildWarrantyUpdate(editing, editValues);
    if (!body) return; // nothing changed: no request
    setEditFailure(null);
    try {
      await update.mutateAsync({ id: editing.id, body });
      toast.success(t("toasts.warrantyUpdated"));
      setEditing(null);
    } catch (err) {
      if (classifyAssetError(err).kind === "warrantyProvider") void providers.refetch();
      setEditFailure(assetErrorMessage(t, err));
    }
  };

  const addButton = caps.manageRecords && !adding ? (
    <Button size="sm" className="gap-2" onClick={() => setAdding(true)} data-testid="add-warranty"><Plus className="h-4 w-4" />{t("warranties.add")}</Button>
  ) : undefined;

  const providerStatusBlock = (forEdit: boolean) => {
    if (providers.isLoading) return <p className="text-sm text-muted-foreground" data-testid="providers-loading">{t("warranties.providersLoading")}</p>;
    if (providers.isError) {
      return (
        <Alert data-testid="providers-unavailable">
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span>{forEdit ? t("warranties.providersUnavailable") : t("warranties.providersUnavailableAdd")}</span>
            <Button type="button" size="sm" variant="outline" onClick={() => void providers.refetch()}>{t("warranties.providersRetry")}</Button>
          </AlertDescription>
        </Alert>
      );
    }
    if (eligible.length === 0 && !forEdit) return <Alert data-testid="providers-none"><AlertDescription>{t("warranties.noProviders")}</AlertDescription></Alert>;
    return null;
  };

  return (
    <RecordsCard title={t("warranties.title")} description={t("warranties.description")} action={addButton}>
      {adding ? (
        <form onSubmit={submit} noValidate className="space-y-4 rounded-lg border p-4" data-testid="warranty-form">
          <div className="space-y-1.5">
            <Label htmlFor={fid("provider")}>{t("warranties.fields.provider")} <span className="text-destructive" aria-hidden="true">*</span></Label>
            {providerStatusBlock(false) ?? (
              <Select value={values.providerOrganizationId} onValueChange={(v) => { setValues((p) => ({ ...p, providerOrganizationId: v })); setErrors((p) => ({ ...p, providerOrganizationId: undefined })); }} disabled={create.isPending}>
                <SelectTrigger id={fid("provider")} aria-invalid={errors.providerOrganizationId ? true : undefined} aria-describedby={errors.providerOrganizationId ? `${fid("provider")}-error` : undefined} data-testid="warranty-provider-select">
                  <SelectValue placeholder={t("warranties.placeholders.provider")} />
                </SelectTrigger>
                <SelectContent>
                  {eligible.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)} data-testid={`provider-option-${p.id}`}>{warrantyProviderName(p, lang) ?? t("warranties.providerUnavailable")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <FieldMessage id={fid("provider")} text={msg(errors, "providerOrganizationId")} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(["startDate", "endDate"] as const).map((f) => (
              <div key={f} className="space-y-1.5">
                <Label htmlFor={fid(f)}>{t(`warranties.fields.${f}`)} <span className="text-destructive" aria-hidden="true">*</span></Label>
                <Input id={fid(f)} type="date" dir="ltr" min="1900-01-01" max="2999-12-31" value={values[f]} disabled={create.isPending}
                  onChange={(e) => { setValues((p) => ({ ...p, [f]: e.target.value })); setErrors((p) => ({ ...p, [f]: undefined })); }}
                  aria-invalid={errors[f] ? true : undefined} aria-describedby={errors[f] ? `${fid(f)}-error` : undefined} />
                <FieldMessage id={fid(f)} text={msg(errors, f)} />
              </div>
            ))}
          </div>
          <FormFailure message={failure} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={close} disabled={create.isPending}>{t("warranties.cancel")}</Button>
            <Button type="submit" disabled={create.isPending || !canPickProvider} data-testid="warranty-submit">{create.isPending ? t("warranties.adding") : t("warranties.add")}</Button>
          </div>
        </form>
      ) : null}

      <RecordsState query={query} emptyText={t("warranties.empty")}>
        {(items) => (
          <ul className="divide-y rounded-lg border" data-testid="warranties-list">
            {items.map((w) => {
              const status = warrantyStatus(w);
              const view = providerView(w);
              return (
                <li key={w.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between" data-testid={`warranty-${w.id}`}>
                  <div className="min-w-0 space-y-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      <span className={view.state === "UNAVAILABLE" ? "italic text-muted-foreground" : undefined} dir="auto" data-testid={`warranty-provider-${w.id}`}>{view.text}</span>
                      {view.state === "INACTIVE" || view.state === "UNLINKED" ? (
                        <Badge variant="outline" className={STATE_STYLE} title={t(`warranties.stateHint.${view.state}`)} data-testid={`warranty-provider-state-${w.id}`}>{t(`warranties.states.${view.state}`)}</Badge>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">{t("warranties.period", { start: formatDateOnly(w.startDate, i18n.language), end: formatDateOnly(w.endDate, i18n.language) })}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={STATUS_STYLE[status]} data-testid={`warranty-status-${w.id}`}>{t(`warranties.status.${status}`)}</Badge>
                    {caps.update ? (
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openEdit(w)} data-testid={`edit-warranty-${w.id}`}><Pencil className="h-4 w-4" />{t("warranties.edit")}</Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </RecordsState>

      <Dialog open={editing != null} onOpenChange={(open) => { if (!open && !update.isPending) setEditing(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("warranties.editTitle")}</DialogTitle>
            <DialogDescription>{t("warranties.editDescription")}</DialogDescription>
          </DialogHeader>
          {editing ? (
            <div className="space-y-4" data-testid="warranty-edit-form">
              <div className="space-y-1.5">
                <Label htmlFor={fid("edit-provider")}>{t("warranties.fields.provider")}</Label>
                <Select value={editValues.providerOrganizationId} onValueChange={(v) => setEditValues((p) => ({ ...p, providerOrganizationId: v }))}
                  disabled={update.isPending || providers.isLoading || providers.isError}>
                  <SelectTrigger id={fid("edit-provider")} data-testid="warranty-edit-provider-select"><SelectValue placeholder={t("warranties.placeholders.provider")} /></SelectTrigger>
                  <SelectContent>
                    {/* the current provider is always listed (even when no longer eligible); only eligible ones are offered besides it */}
                    {warrantyProviderChoices(editing, eligible).map((c) => (
                      <SelectItem key={c.id} value={String(c.id)} data-testid={`edit-provider-option-${c.id}`}>{choiceLabel(c)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {providerStatusBlock(true)}
                {editing.provider && editing.provider.state !== "ELIGIBLE" && String(editing.providerOrganizationId) === editValues.providerOrganizationId ? (
                  <p className="text-xs text-muted-foreground" data-testid="warranty-edit-provider-hint">{t(`warranties.stateHint.${editing.provider.state}`)}</p>
                ) : null}
              </div>
              {(["startDate", "endDate"] as const).map((f) => (
                <div key={f} className="space-y-1.5">
                  <Label htmlFor={fid(`edit-${f}`)}>{t(`warranties.fields.${f}`)}</Label>
                  <Input id={fid(`edit-${f}`)} type="date" dir="ltr" min="1900-01-01" max="2999-12-31" value={editValues[f]} disabled={update.isPending}
                    onChange={(e) => { setEditValues((p) => ({ ...p, [f]: e.target.value })); setEditErrors((p) => ({ ...p, [f]: undefined })); }}
                    aria-invalid={editErrors[f] ? true : undefined} aria-describedby={editErrors[f] ? `${fid(`edit-${f}`)}-error` : undefined} />
                  <FieldMessage id={fid(`edit-${f}`)} text={msg(editErrors, f)} />
                </div>
              ))}
              <FormFailure message={editFailure} />
              {!changes ? <p className="text-xs text-muted-foreground" role="status" data-testid="warranty-edit-nochanges">{t("warranties.noChanges")}</p> : null}
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => setEditing(null)} disabled={update.isPending}>{t("warranties.cancel")}</Button>
            <Button type="button" onClick={submitEdit} disabled={update.isPending || !changes} data-testid="warranty-edit-submit">{update.isPending ? t("warranties.saving") : t("warranties.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RecordsCard>
  );
}
