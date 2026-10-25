import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Download, Eye, ExternalLink, FileText, Info, Loader2, Plus, ShieldAlert, Trash2, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/patterns";
import { useAssetDocuments, useCreateAssetDocument, useDeleteAssetDocument, useDocumentUploadCompleted } from "@/hooks/Assets/useAssetManagement";
import { useDocumentFile } from "@/hooks/Assets/useDocumentFile";
import { documentActions, documentDisplayName, documentTypeLabel, formatFileSize } from "@/lib/documentUploads";
import { buildDocumentBody, classifyAssetError, formatDateTime, isSafeLinkHref, validateDocumentForm, type AssetCapabilities, type DocumentFormValues, type FieldErrors } from "@/lib/assets";
import type { AssetDocument } from "@/types/asset";
import DocumentUploadForm from "./DocumentUploadForm";
import { FieldMessage, FormFailure, RecordsCard, RecordsState } from "./AssetRecordParts";
import { assetErrorMessage } from "./assetErrors";

const EMPTY: DocumentFormValues = { fileUrl: "", title: "", fileType: "" };

export default function AssetDocumentsTab({ assetId, caps }: { assetId: number | string; caps: AssetCapabilities }) {
  const { t, i18n } = useTranslation("assets");
  const uid = useId();
  const query = useAssetDocuments(assetId);
  const create = useCreateAssetDocument(assetId);
  const remove = useDeleteAssetDocument(assetId);
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState<"upload" | "link">("upload");
  const uploaded = useDocumentUploadCompleted(assetId);
  const files = useDocumentFile();
  const [values, setValues] = useState<DocumentFormValues>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors<keyof DocumentFormValues>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [serverUrlError, setServerUrlError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AssetDocument | null>(null);
  const [deleteFailure, setDeleteFailure] = useState<string | null>(null);
  const fid = (f: keyof DocumentFormValues) => `${uid}-${f}`;
  const msg = (f: keyof DocumentFormValues) => (errors[f] ? t(`validation.${errors[f]!.key}`, { max: errors[f]!.max }) : f === "fileUrl" ? serverUrlError ?? undefined : undefined);

  const set = (f: keyof DocumentFormValues, v: string) => {
    setValues((p) => ({ ...p, [f]: v }));
    setErrors((p) => ({ ...p, [f]: undefined }));
    if (f === "fileUrl") setServerUrlError(null);
  };
  const close = () => { setAdding(false); setValues(EMPTY); setErrors({}); setFailure(null); setServerUrlError(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (create.isPending) return;
    const found = validateDocumentForm(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    setFailure(null);
    try {
      await create.mutateAsync(buildDocumentBody(values));
      toast.success(t("toasts.documentAdded"));
      close();
    } catch (err) {
      if (classifyAssetError(err).kind === "unsafeUrl") setServerUrlError(t("errors.unsafeUrl"));
      else setFailure(assetErrorMessage(t, err));
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleteFailure(null);
    try {
      await remove.mutateAsync(toDelete.id);
      toast.success(t("toasts.documentDeleted"));
      setToDelete(null);
    } catch (err) {
      setDeleteFailure(assetErrorMessage(t, err));
    }
  };

  return (
    <RecordsCard
      title={t("documents.title")}
      description={t("documents.description")}
      action={caps.manageRecords && !adding ? (
        <Button size="sm" className="gap-2" onClick={() => { setMode("upload"); setAdding(true); }} data-testid="add-document"><Plus className="h-4 w-4" />{t("documents.add")}</Button>
      ) : undefined}
      notice={
        caps.manageRecords ? (
          <Alert data-testid="documents-help">
            <Info className="h-4 w-4" />
            <AlertDescription>{t("documents.help")}</AlertDescription>
          </Alert>
        ) : undefined
      }
    >
      {adding ? (
        <div role="group" aria-label={t("documents.modes.label")} className="flex gap-2" data-testid="document-modes">
          {(["upload", "link"] as const).map((m) => (
            <Button key={m} type="button" size="sm" variant={mode === m ? "default" : "outline"} aria-pressed={mode === m} onClick={() => setMode(m)} data-testid={`document-mode-${m}`}>
              {t(`documents.modes.${m}`)}
            </Button>
          ))}
        </div>
      ) : null}
      {adding && mode === "upload" ? (
        <DocumentUploadForm assetId={assetId} onUploaded={uploaded} onClose={close} />
      ) : null}
      {adding && mode === "link" ? (
        <form onSubmit={submit} noValidate className="space-y-4 rounded-lg border p-4" data-testid="document-form">
          <div className="space-y-1.5">
            <Label htmlFor={fid("fileUrl")}>{t("documents.fields.fileUrl")} <span className="text-destructive" aria-hidden="true">*</span></Label>
            <Input id={fid("fileUrl")} dir="ltr" value={values.fileUrl} onChange={(e) => set("fileUrl", e.target.value)} placeholder={t("documents.placeholders.fileUrl")} disabled={create.isPending}
              aria-invalid={msg("fileUrl") ? true : undefined} aria-describedby={msg("fileUrl") ? `${fid("fileUrl")}-error` : undefined} />
            <FieldMessage id={fid("fileUrl")} text={msg("fileUrl")} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={fid("title")}>{t("documents.fields.title")}</Label>
              <Input id={fid("title")} value={values.title} onChange={(e) => set("title", e.target.value)} placeholder={t("documents.placeholders.title")} disabled={create.isPending}
                aria-invalid={msg("title") ? true : undefined} aria-describedby={msg("title") ? `${fid("title")}-error` : undefined} />
              <FieldMessage id={fid("title")} text={msg("title")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={fid("fileType")}>{t("documents.fields.fileType")}</Label>
              <Input id={fid("fileType")} dir="ltr" value={values.fileType} onChange={(e) => set("fileType", e.target.value)} placeholder={t("documents.placeholders.fileType")} disabled={create.isPending}
                aria-invalid={msg("fileType") ? true : undefined} aria-describedby={msg("fileType") ? `${fid("fileType")}-error` : undefined} />
              <FieldMessage id={fid("fileType")} text={msg("fileType")} />
            </div>
          </div>
          <FormFailure message={failure} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={close} disabled={create.isPending}>{t("documents.cancel")}</Button>
            <Button type="submit" disabled={create.isPending} data-testid="document-submit">{create.isPending ? t("documents.adding") : t("documents.add")}</Button>
          </div>
        </form>
      ) : null}

      <RecordsState query={query} emptyText={t("documents.empty")}>
        {(docs) => (
          <ul className="divide-y rounded-lg border" data-testid="documents-list">
            {docs.map((d) => {
              const actions = documentActions(d);
              const name = documentDisplayName(d);
              const typeLabel = documentTypeLabel(d);
              const rowBusy = files.busy?.docId === d.id ? files.busy.action : null;
              const rowError = files.error?.docId === d.id ? files.error.key : null;
              const open = files.preview?.docId === d.id ? files.preview : null;
              return (
              <li key={d.id} className="space-y-2 p-3" data-testid={`document-${d.id}`}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 space-y-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium" dir="auto">
                      {name || t("documents.untitled")}
                      {typeLabel ? <Badge variant="outline" dir="ltr">{typeLabel}</Badge> : null}
                      {actions.source === "UPLOAD" ? <Badge variant="secondary" data-testid={`document-scan-${d.id}`}>{t(`documents.item.scan.${d.scanStatus ?? "NOT_SCANNED"}`)}</Badge> : null}
                    </p>
                    {actions.source === "LINK" && d.fileUrl && !isSafeLinkHref(d.fileUrl) ? <p className="break-all text-xs text-muted-foreground" dir="ltr">{d.fileUrl}</p> : null}
                    <p className="text-xs text-muted-foreground">
                      {actions.source === "UPLOAD" && d.sizeBytes != null ? <><span dir="ltr">{formatFileSize(d.sizeBytes, i18n.language)}</span> · </> : null}
                      {t("documents.uploadedBy", { name: d.UploadedByUser?.fullName ?? t("documents.unknownUser") })} · {formatDateTime(d.createdAt, i18n.language)}
                    </p>
                    {actions.pdfDownloadOnly ? <p className="text-xs text-muted-foreground" data-testid={`document-pdf-note-${d.id}`}>{t("documents.item.pdfDownloadOnly")}</p> : null}
                    {actions.blocked ? <p className="flex items-center gap-1.5 text-xs text-destructive" data-testid={`document-blocked-${d.id}`}><ShieldAlert className="h-3.5 w-3.5" />{t("documents.item.blocked")}</p> : null}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {actions.openLink && d.fileUrl ? (
                    <Button asChild size="sm" variant="outline" className="gap-1.5">
                      <a href={d.fileUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" />{t("documents.open")}</a>
                    </Button>
                  ) : null}
                  {actions.preview ? (
                    <Button size="sm" variant="outline" className="gap-1.5" disabled={files.busy != null} onClick={() => files.openPreview(d)} data-testid={`preview-document-${d.id}`}>
                      {rowBusy === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}{rowBusy === "preview" ? t("documents.item.previewing") : t("documents.item.preview")}
                    </Button>
                  ) : null}
                  {actions.download ? (
                    <Button size="sm" variant="outline" className="gap-1.5" disabled={files.busy != null} onClick={() => files.download(d)} data-testid={`download-document-${d.id}`}>
                      {rowBusy === "download" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{rowBusy === "download" ? t("documents.item.downloading") : t("documents.item.download")}
                    </Button>
                  ) : null}
                  {caps.deleteDocument ? (
                    <Button size="sm" variant="outline" className="gap-1.5 text-destructive" onClick={() => { setDeleteFailure(null); setToDelete(d); }} data-testid={`delete-document-${d.id}`}>
                      <Trash2 className="h-4 w-4" />{t("documents.delete")}
                    </Button>
                  ) : null}
                </div>
                </div>
                {rowError ? <p className="text-sm text-destructive" role="alert" data-testid={`document-file-error-${d.id}`}>{t(`documents.fileErrors.${rowError}`)}</p> : null}
                {open ? (
                  <div className="space-y-2 rounded-md border p-2" data-testid={`document-preview-${d.id}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-sm font-medium" dir="auto">{t("documents.item.previewTitle", { name: name ?? t("documents.untitled") })}</span>
                      <Button size="sm" variant="ghost" className="gap-1.5" onClick={files.closePreview} data-testid={`close-preview-${d.id}`}><X className="h-4 w-4" />{t("documents.item.closePreview")}</Button>
                    </div>
                    {open.kind === "image" ? (
                      <img src={open.url} alt={t("documents.item.previewAlt", { name: name ?? "" })} className="mx-auto max-h-[70vh] max-w-full object-contain" />
                    ) : (
                      <iframe src={open.url} title={t("documents.item.previewFrame", { name: name ?? "" })} sandbox="" className="h-[70vh] w-full rounded border" />
                    )}
                  </div>
                ) : null}
              </li>
              );
            })}
          </ul>
        )}
      </RecordsState>

      <ConfirmDialog
        open={toDelete != null}
        onOpenChange={(open) => { if (!open) setToDelete(null); }}
        title={t("documents.deleteTitle")}
        description={toDelete?.source === "UPLOAD" ? t("documents.deleteUploadDescription") : t("documents.deleteDescription")}
        confirmLabel={remove.isPending ? t("documents.deleting") : t("documents.confirmDelete")}
        cancelLabel={t("documents.cancel")}
        variant="destructive"
        isPending={remove.isPending}
        onConfirm={confirmDelete}
      >
        <FormFailure message={deleteFailure} />
      </ConfirmDialog>
    </RecordsCard>
  );
}
