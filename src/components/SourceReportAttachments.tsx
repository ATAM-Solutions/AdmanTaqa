import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, ImageOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchSourceReportFile } from "@/api/services/sourceReportService";
import type { SourceReportAttachment } from "@/types/sourceReport";

function useFileBlob(downloadUrl: string, enabled: boolean) {
  return useQuery({
    queryKey: ["source-report-file", downloadUrl],
    queryFn: () => fetchSourceReportFile(downloadUrl),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

function useObjectUrl(blob: Blob | undefined) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);
  return url;
}

function saveBlob(blob: Blob, name: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(href);
}

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp", "application/pdf": "pdf" };

function Tile({ attachment }: { attachment: SourceReportAttachment }) {
  const { t } = useTranslation("common");
  const isImage = attachment.fileType === "IMAGE";
  // images are fetched to preview; documents only when the user asks (open / download)
  const { data: blob, isLoading, isError, refetch, isFetching } = useFileBlob(attachment.downloadUrl, isImage);
  const preview = useObjectUrl(isImage ? blob : undefined);
  const label = attachment.caption || t("sourceReport.fileLabel", { id: attachment.id });

  const getBlob = async () => blob ?? (await refetch()).data;
  const open = async () => {
    const b = await getBlob();
    if (b) window.open(URL.createObjectURL(b), "_blank", "noopener,noreferrer");
  };
  const download = async () => {
    const b = await getBlob();
    if (b) saveBlob(b, `${label}.${EXT[b.type] ?? "bin"}`.replace(/[\\/]/g, "_"));
  };

  return (
    <div className="flex w-36 flex-col gap-1" data-testid="source-report-file">
      <button
        type="button"
        onClick={open}
        title={label}
        className="flex h-32 w-36 items-center justify-center overflow-hidden rounded-lg border bg-muted/30 hover:bg-muted/60"
      >
        {isImage && preview ? (
          <img src={preview} alt={label} className="h-full w-full object-cover" />
        ) : isImage && isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : isImage && isError ? (
          <span className="flex flex-col items-center gap-1 p-2 text-center text-xs text-destructive">
            <ImageOff className="h-6 w-6" />
            {t("sourceReport.loadFailed")}
          </span>
        ) : (
          <span className="flex flex-col items-center gap-1 p-2 text-center text-xs">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <span className="line-clamp-2" dir="auto">{label}</span>
          </span>
        )}
      </button>
      <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={download} disabled={isFetching}>
        <Download className="h-3.5 w-3.5" /> {t("sourceReport.download")}
      </Button>
    </div>
  );
}

/** Read-only files of the report a work order / station request was created from (authenticated preview + download). */
export default function SourceReportAttachments({ attachments }: { attachments: SourceReportAttachment[] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {attachments.map((a) => (
        <Tile key={a.id} attachment={a} />
      ))}
    </div>
  );
}
