import { useCallback, useEffect, useRef, useState } from "react";
import { assetService } from "@/api/services/assetService";
import { downloadFileNameFor, documentErrorKey, isCancellation, ObjectUrlRegistry, previewKind, type DocumentErrorKey } from "@/lib/documentUploads";
import type { AssetDocument } from "@/types/asset";

export interface PreviewState {
  docId: number;
  kind: "image" | "pdf";
  url: string;
}

/**
 * Authenticated preview / download of ONE list's uploaded documents. The file is fetched with the normal login header
 * (never a bare link or <img src>), turned into a temporary object URL, and every URL is revoked when the preview closes,
 * a download has started, or the list unmounts. The Blob is re-typed from the document's VERIFIED metadata, so what the
 * browser renders never depends on a response header.
 */
export function useDocumentFile() {
  const registry = useRef(new ObjectUrlRegistry());
  const [busy, setBusy] = useState<{ docId: number; action: "preview" | "download" } | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [error, setError] = useState<{ docId: number; key: DocumentErrorKey } | null>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const reg = registry.current;
    return () => { controller.current?.abort(); reg.revokeAll(); };
  }, []);

  const closePreview = useCallback(() => {
    setPreview((p) => { if (p) registry.current.revoke(p.url); return null; });
  }, []);

  const run = useCallback(async (doc: AssetDocument, action: "preview" | "download") => {
    if (busy) return; // one request at a time
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    setError(null);
    setBusy({ docId: doc.id, action });
    try {
      const blob = await assetService.fetchDocumentFile(doc.id, { download: action === "download", signal: c.signal });
      const typed = new Blob([blob], { type: doc.mimeType ?? "application/octet-stream" });
      if (action === "download") {
        const url = registry.current.create(typed);
        const a = document.createElement("a");
        a.href = url;
        a.download = downloadFileNameFor(doc);
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
        registry.current.revokeLater(url);
      } else {
        const kind = previewKind(doc.mimeType);
        if (!kind) throw Object.assign(new Error("not previewable"), { response: { status: 415, data: {} } });
        closePreview();
        setPreview({ docId: doc.id, kind, url: registry.current.create(typed) });
      }
    } catch (e) {
      if (!isCancellation(e)) setError({ docId: doc.id, key: documentErrorKey(e) });
    } finally {
      if (controller.current === c) controller.current = null;
      setBusy(null);
    }
  }, [busy, closePreview]);

  return {
    busy, preview, error,
    openPreview: (doc: AssetDocument) => run(doc, "preview"),
    download: (doc: AssetDocument) => run(doc, "download"),
    closePreview,
    clearError: () => setError(null),
  };
}
