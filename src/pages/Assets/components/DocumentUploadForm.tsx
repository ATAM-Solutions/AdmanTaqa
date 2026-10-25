import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Paperclip, RotateCcw, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { assetService } from "@/api/services/assetService";
import { DOCUMENT_UPLOAD_ACCEPT, formatFileSize } from "@/lib/documentUploads";
import { UploadSession, type UploadFn } from "@/lib/uploadSession";
import type { AssetDocument } from "@/types/asset";

interface Props {
  assetId: number | string;
  /** Called only after the API confirmed the document (a replay of an earlier identical upload counts). */
  onUploaded: (document: AssetDocument) => void;
  onClose: () => void;
  /** test seam */
  upload?: UploadFn;
}

/**
 * "Upload a file" mode of the document form. All rules live in `UploadSession` (validation, retry key, no double submit,
 * cancel); this is the presentation: file picker (camera/library on phones), name + size, progress, cancel, retry.
 */
export default function DocumentUploadForm({ assetId, onUploaded, onClose, upload }: Props) {
  const { t, i18n } = useTranslation("assets");
  const uid = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const session = useMemo(
    () => new UploadSession(upload ?? ((input, options) => assetService.uploadDocument(assetId, input, { onProgress: options.onProgress, signal: options.signal }))),
    [assetId, upload]
  );
  const state = useSyncExternalStore(session.subscribe, session.getState, session.getState);
  // leaving the form (or the page) never leaves a request running in the background
  useEffect(() => () => session.cancel(), [session]);

  const uploading = state.phase === "uploading";
  const canSubmit = !!state.file && !state.fileError && !uploading;
  const fileId = `${uid}-file`;
  const titleId = `${uid}-title`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const doc = await session.start(title);
    if (doc) {
      toast.success(session.getState().replay ? t("toasts.documentAlreadyUploaded") : t("toasts.documentUploaded"));
      onUploaded(doc);
      session.reset();
      onClose();
    }
  };

  const fileErrorText = state.fileError ? t(`documents.fileChecks.${state.fileError.key}`, { max: state.fileError.maxMb }) : null;
  const failureText = state.phase === "error" && state.errorKey ? t(`documents.fileErrors.${state.errorKey}`) : null;
  const retryable = state.phase === "error" && state.errorKey !== null && ["network", "server", "unavailable", "storageUnavailable", "scanUnavailable", "schemaNotReady"].includes(state.errorKey);

  return (
    <form onSubmit={submit} noValidate className="space-y-4 rounded-lg border p-4" data-testid="document-upload-form">
      <div className="space-y-1.5">
        <Label htmlFor={fileId}>{t("documents.upload.fileLabel")} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            id={fileId}
            type="file"
            accept={DOCUMENT_UPLOAD_ACCEPT}
            className="sr-only"
            disabled={uploading}
            data-testid="document-file-input"
            aria-describedby={`${fileId}-hint`}
            onChange={(e) => { session.select(e.target.files?.[0] ?? null); e.target.value = ""; }}
          />
          <Button type="button" variant="outline" className="gap-2" disabled={uploading} onClick={() => inputRef.current?.click()} data-testid="document-choose-file">
            <Paperclip className="h-4 w-4" />{state.file ? t("documents.upload.changeFile") : t("documents.upload.chooseFile")}
          </Button>
          <span className="min-w-0 break-all text-sm text-muted-foreground" dir="auto" data-testid="document-file-summary">
            {state.file ? t("documents.upload.fileSummary", { name: state.file.name, size: formatFileSize(state.file.size, i18n.language) }) : t("documents.upload.noFile")}
          </span>
        </div>
        <p id={`${fileId}-hint`} className="text-xs text-muted-foreground">{t("documents.upload.hint")}</p>
        {fileErrorText ? <p className="text-sm text-destructive" role="alert" data-testid="document-file-error">{fileErrorText}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={titleId}>{t("documents.upload.titleLabel")}</Label>
        <Input id={titleId} value={title} maxLength={255} onChange={(e) => setTitle(e.target.value)} placeholder={t("documents.upload.titlePlaceholder")} disabled={uploading} />
      </div>

      {uploading ? (
        <div className="space-y-1.5" data-testid="document-progress">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{t("documents.upload.uploading")}</span>
            <span dir="ltr">{state.progress == null ? "" : t("documents.upload.progress", { percent: state.progress })}</span>
          </div>
          <div
            role="progressbar"
            aria-label={t("documents.upload.progressLabel")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={state.progress ?? undefined}
            className="h-2 w-full overflow-hidden rounded bg-muted"
          >
            <div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${state.progress ?? 100}%` }} />
          </div>
        </div>
      ) : null}

      {failureText ? (
        <Alert variant="destructive" role="alert" data-testid="document-upload-failure">
          <AlertDescription>
            {failureText}
            {retryable ? <span className="mt-1 block text-xs">{t("documents.upload.retryHint")}</span> : null}
          </AlertDescription>
        </Alert>
      ) : null}
      {state.phase === "cancelled" ? (
        <Alert role="status" data-testid="document-upload-cancelled"><AlertDescription>{t("documents.upload.cancelled")}</AlertDescription></Alert>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        {uploading ? (
          <Button type="button" variant="outline" className="gap-2" onClick={() => session.cancel()} data-testid="document-cancel-upload"><X className="h-4 w-4" />{t("documents.upload.cancelUpload")}</Button>
        ) : (
          <Button type="button" variant="outline" onClick={() => { session.reset(); onClose(); }}>{t("documents.cancel")}</Button>
        )}
        <Button type="submit" disabled={!canSubmit} className="gap-2" data-testid="document-upload-submit">
          {state.phase === "error" || state.phase === "cancelled" ? <RotateCcw className="h-4 w-4" /> : null}
          {uploading ? t("documents.upload.uploading") : state.phase === "error" || state.phase === "cancelled" ? t("documents.upload.retry") : t("documents.upload.submit")}
        </Button>
      </div>
    </form>
  );
}
