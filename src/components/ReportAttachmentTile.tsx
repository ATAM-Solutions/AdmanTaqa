import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, ImageOff, ExternalLink } from "lucide-react";
import type { ReportAttachment } from "@/types/maintenanceReport";

/**
 * One attachment: an image thumbnail that opens full-size in a new tab, or a document link.
 * A failed image load shows an explicit "could not load" tile with an open-link — never a silent
 * generic placeholder that looks like "no image".
 */
export default function ReportAttachmentTile({ attachment }: { attachment: ReportAttachment }) {
  const { t } = useTranslation("maintenanceReports");
  const [failed, setFailed] = useState(false);
  const isImage = attachment.fileType === "IMAGE";

  if (!isImage) {
    return (
      <a
        href={attachment.fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-32 w-32 flex-col items-center justify-center gap-2 rounded-lg border bg-muted/30 p-2 text-center text-xs hover:bg-muted/60"
      >
        <FileText className="h-8 w-8 text-muted-foreground" />
        <span className="line-clamp-2">{attachment.caption || t("details.openDocument")}</span>
      </a>
    );
  }

  if (failed) {
    return (
      <a
        href={attachment.fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-32 w-32 flex-col items-center justify-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-2 text-center text-xs text-destructive"
      >
        <ImageOff className="h-8 w-8" />
        <span>{t("details.imageLoadFailed")}</span>
        <span className="inline-flex items-center gap-1 underline">
          <ExternalLink className="h-3 w-3" />
          {t("details.openOriginal")}
        </span>
      </a>
    );
  }

  return (
    <a
      href={attachment.fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={attachment.caption ?? undefined}
      className="block h-32 w-32 overflow-hidden rounded-lg border bg-muted/30"
    >
      <img
        src={attachment.fileUrl}
        alt={attachment.caption ?? t("details.attachmentAlt")}
        loading="lazy"
        className="h-full w-full object-cover transition-transform hover:scale-105"
        onError={() => setFailed(true)}
      />
    </a>
  );
}
