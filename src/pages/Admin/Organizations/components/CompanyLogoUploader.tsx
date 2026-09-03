import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ConfirmDialog } from "@/components/patterns";
import { CompanyAvatar } from "@/components/company/CompanyAvatar";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

interface CompanyLogoUploaderProps {
  logoUrl: string | null;
  name: string;
  isUploading: boolean;
  progress: number;
  onUpload: (file: File) => void;
  onRemove?: () => void;
  isRemoving?: boolean;
  size?: "md" | "lg";
  disabled?: boolean;
}

/**
 * Logo picker with drag & drop, client-side validation, instant preview and
 * upload progress. The actual upload is owned by the parent (onUpload).
 */
export function CompanyLogoUploader({
  logoUrl,
  name,
  isUploading,
  progress,
  onUpload,
  onRemove,
  isRemoving = false,
  size = "md",
  disabled = false,
}: CompanyLogoUploaderProps) {
  const { t } = useTranslation("adminOrganizations");
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  // Drop the local preview once the upload is over (server logoUrl takes over).
  useEffect(() => {
    if (!isUploading && previewUrl) {
      const url = previewUrl;
      setPreviewUrl(null);
      URL.revokeObjectURL(url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUploading]);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  const busy = isUploading || isRemoving || disabled;

  const handleFile = (file: File | undefined | null) => {
    if (!file || busy) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error(t("logo.invalidType"));
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error(t("logo.tooLarge"));
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
    onUpload(file);
  };

  const openPicker = () => {
    if (!busy) inputRef.current?.click();
  };

  const shownLogo = previewUrl ?? logoUrl;

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        aria-label={t("logo.dropHere")}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex items-center gap-4 rounded-xl border-2 border-dashed p-4 transition-colors",
          busy ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:border-primary/50 hover:bg-primary/5",
          dragOver ? "border-primary bg-primary/10" : "border-muted-foreground/25"
        )}
      >
        <div className="relative">
          <CompanyAvatar logoUrl={shownLogo} name={name} size={size === "lg" ? "xl" : "lg"} />
          {isUploading ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/70">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : null}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="flex items-center gap-2 text-sm font-medium">
            <UploadCloud className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{shownLogo ? t("logo.change") : t("logo.dropHere")}</span>
          </p>
          <p className="text-xs text-muted-foreground">{t("logo.hint")}</p>
          {!shownLogo && !isUploading ? (
            <p className="text-xs italic text-muted-foreground">{t("logo.noLogo")}</p>
          ) : null}
          {isUploading ? (
            <div className="space-y-1 pt-1">
              <Progress value={progress} className="h-1.5" />
              <p className="text-xs text-muted-foreground">{t("logo.uploading", { progress })}</p>
            </div>
          ) : null}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={openPicker} disabled={busy}>
          <ImagePlus className="me-2 h-4 w-4" />
          {logoUrl ? t("actions.replaceLogo") : t("actions.uploadLogo")}
        </Button>
        {logoUrl && onRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmRemove(true)}
            disabled={busy}
          >
            {isRemoving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Trash2 className="me-2 h-4 w-4" />}
            {t("actions.removeLogo")}
          </Button>
        ) : null}
      </div>

      {onRemove ? (
        <ConfirmDialog
          open={confirmRemove}
          onOpenChange={setConfirmRemove}
          title={t("confirm.removeLogoTitle")}
          description={t("confirm.removeLogoDescription")}
          confirmLabel={t("actions.removeLogo")}
          variant="destructive"
          isPending={isRemoving}
          onConfirm={() => {
            onRemove();
            setConfirmRemove(false);
          }}
        />
      ) : null}
    </div>
  );
}
