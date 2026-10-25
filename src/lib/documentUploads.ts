import type { AssetDocument, ScanStatus } from "@/types/asset";
import { isSafeLinkHref } from "@/lib/assets";
import { formatNumber } from "@/lib/i18n/formatters";

/**
 * Pure rules for asset-document uploads, previews and downloads (Phase 3D.2).
 * The BACKEND decides everything that matters (type by content, size, scanning, quarantine, access); these rules only avoid
 * pointless requests, explain outcomes, and never offer an action the backend would refuse.
 */

// ── client-side file checks (mirror the backend; the server stays authoritative) ─────────────────────────────────────

export const DOCUMENT_UPLOAD_MAX_BYTES = 15 * 1024 * 1024;
export const DOCUMENT_UPLOAD_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp"] as const;
/** `accept` of the file input: on phones this also offers the camera and the photo library. */
export const DOCUMENT_UPLOAD_ACCEPT = DOCUMENT_UPLOAD_TYPES.join(",");

const EXTENSION_BY_MIME: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp" };
const MIME_LABEL: Record<string, string> = { "application/pdf": "PDF", "image/jpeg": "JPEG", "image/png": "PNG", "image/gif": "GIF", "image/webp": "WebP" };
// the backend's own list of executable/scriptable extensions (utils/fileSignature.js)
const DANGEROUS_EXTENSIONS = new Set(["php", "phtml", "php3", "php4", "php5", "exe", "sh", "bash", "js", "mjs", "cjs", "html", "htm", "jsp", "asp", "aspx", "cgi", "py", "rb", "pl", "bat", "cmd", "msi"]);

export type FileCheckKey = "empty" | "tooLarge" | "typeInvalid" | "unsafeName";
export interface FileCheckError {
  key: FileCheckKey;
  /** the limit in MB, for tooLarge */
  maxMb?: number;
}

/** Same unsafe-name rule the server applies to asset documents: a dangerous FINAL extension or a dangerous INNER one. */
export function hasUnsafeFileName(name: string): boolean {
  const base = name.split(/[\\/]/).pop() ?? "";
  const parts = base.split(".").filter(Boolean);
  if (parts.length < 2) return false;
  const exts = parts.slice(1).map((p) => p.toLowerCase());
  return exts.some((e) => DANGEROUS_EXTENSIONS.has(e));
}

export function validateUploadFile(file: { name: string; size: number; type: string }): FileCheckError | null {
  if (file.size === 0) return { key: "empty" };
  if (file.size > DOCUMENT_UPLOAD_MAX_BYTES) return { key: "tooLarge", maxMb: DOCUMENT_UPLOAD_MAX_BYTES / (1024 * 1024) };
  if (!(DOCUMENT_UPLOAD_TYPES as readonly string[]).includes(file.type)) return { key: "typeInvalid" };
  if (hasUnsafeFileName(file.name)) return { key: "unsafeName" };
  return null;
}

export function formatFileSize(bytes: number | null | undefined, locale: string): string {
  if (bytes == null || !Number.isFinite(bytes)) return "";
  const kb = 1024;
  const units: [number, string][] = [[kb * kb, "MB"], [kb, "KB"]];
  for (const [size, unit] of units) {
    if (bytes >= size) return `${formatNumber(bytes / size, locale, { maximumFractionDigits: 1 })} ${unit}`;
  }
  return `${formatNumber(bytes, locale)} B`;
}

// ── retry key ────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Identity of the chosen file for retry purposes. Picking the SAME file again is the same upload; another file is a new one. */
export const uploadFileKey = (file: { name: string; size: number; lastModified?: number }) => `${file.name}|${file.size}|${file.lastModified ?? 0}`;

export function createClientRequestId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  const bytes = new Uint8Array(16);
  c?.getRandomValues?.(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("") || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * The retry key to use for `file`: the SAME key as before when the same file is still selected (a retry after a dropped
 * connection must not create a second document), a NEW key for any different file or a brand-new operation (prev = null).
 */
export function nextClientRequestId(prev: { fileKey: string; id: string } | null, file: { name: string; size: number; lastModified?: number }, make: () => string = createClientRequestId) {
  const fileKey = uploadFileKey(file);
  return prev && prev.fileKey === fileKey ? prev : { fileKey, id: make() };
}

// ── what the list may offer for one document ────────────────────────────────────────────────────────────────────────

export const isBlockedScanStatus = (s: ScanStatus | undefined) => s === "INFECTED" || s === "SCAN_FAILED";

export interface DocumentActions {
  source: "LINK" | "UPLOAD";
  /** LINK with a safe http(s) address: open it directly, exactly as before. */
  openLink: boolean;
  /** UPLOAD that the backend will preview inline (images; PDFs only once scanned CLEAN). */
  preview: boolean;
  /** UPLOAD that can be fetched as a download. */
  download: boolean;
  /** UPLOAD PDF that is not scanned clean: download only, with an explanation. */
  pdfDownloadOnly: boolean;
  /** INFECTED / SCAN_FAILED: no preview and no download is offered. */
  blocked: boolean;
}

export function documentActions(doc: Pick<AssetDocument, "source" | "fileUrl" | "mimeType" | "scanStatus">): DocumentActions {
  const source = doc.source === "UPLOAD" ? "UPLOAD" : "LINK";
  if (source === "LINK") {
    return { source, openLink: !!doc.fileUrl && isSafeLinkHref(doc.fileUrl), preview: false, download: false, pdfDownloadOnly: false, blocked: false };
  }
  const scan = doc.scanStatus ?? "NOT_SCANNED";
  const blocked = isBlockedScanStatus(scan);
  const mime = doc.mimeType ?? "";
  const isImage = mime.startsWith("image/") && (DOCUMENT_UPLOAD_TYPES as readonly string[]).includes(mime);
  const isPdf = mime === "application/pdf";
  return {
    source,
    openLink: false,
    preview: !blocked && (isImage || (isPdf && scan === "CLEAN")),
    download: !blocked,
    pdfDownloadOnly: !blocked && isPdf && scan !== "CLEAN",
    blocked,
  };
}

export const documentDisplayName = (doc: Pick<AssetDocument, "title" | "originalName">): string | null => doc.title?.trim() || doc.originalName?.trim() || null;

/** "PDF" / "PNG" … from the VERIFIED type; falls back to the free-text type of a link document. */
export const documentTypeLabel = (doc: Pick<AssetDocument, "mimeType" | "fileType">): string | null =>
  (doc.mimeType && MIME_LABEL[doc.mimeType]) || doc.fileType || null;

/** File name for a download: the user's name without its extension plus the extension of the VERIFIED type (never an executable name). */
export function downloadFileNameFor(doc: Pick<AssetDocument, "originalName" | "title" | "mimeType" | "id">): string {
  const ext = (doc.mimeType && EXTENSION_BY_MIME[doc.mimeType]) || "bin";
  let base = (doc.originalName ?? doc.title ?? "").split(/[\\/]/).pop() ?? "";
  // eslint-disable-next-line no-control-regex
  base = base.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\.[A-Za-z0-9]{1,8}$/, "");
  base = base.replace(/[^\p{L}\p{N} ._-]/gu, "_").replace(/^[.\s_]+/, "").trim().slice(0, 120);
  return `${base || `document-${doc.id}`}.${ext}`;
}

/** Only the verified types may ever be rendered inline; the Blob is re-typed from the metadata, never from the response header. */
export const previewKind = (mime: string | null | undefined): "image" | "pdf" | null =>
  mime === "application/pdf" ? "pdf" : mime && mime.startsWith("image/") && (DOCUMENT_UPLOAD_TYPES as readonly string[]).includes(mime) ? "image" : null;

// ── object URLs ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** Tracks temporary blob: URLs so every one is revoked — on close, on a timer after a download, and when the page unmounts. */
export class ObjectUrlRegistry {
  private urls = new Set<string>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private api: { create: (b: Blob) => string; revoke: (u: string) => void };
  constructor(api?: { create: (b: Blob) => string; revoke: (u: string) => void }) {
    this.api = api ?? { create: (b) => URL.createObjectURL(b), revoke: (u) => URL.revokeObjectURL(u) };
  }
  create(blob: Blob): string {
    const url = this.api.create(blob);
    this.urls.add(url);
    return url;
  }
  revoke(url: string) {
    if (this.urls.delete(url)) this.api.revoke(url);
  }
  revokeLater(url: string, ms = 30_000) {
    const t = setTimeout(() => { this.timers.delete(t); this.revoke(url); }, ms);
    this.timers.add(t);
  }
  revokeAll() {
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    for (const u of [...this.urls]) this.revoke(u);
  }
  get size() { return this.urls.size; }
}

// ── errors ───────────────────────────────────────────────────────────────────────────────────────────────────────────

export type DocumentErrorKey =
  | "fileRequired" | "fileEmpty" | "fileTooLarge" | "fileTypeInvalid" | "signatureUnsupported" | "signatureMismatch" | "unsafeName"
  | "limitReached" | "idempotencyReused" | "malware" | "scanUnavailable" | "quarantined" | "storageUnavailable" | "fileMissing"
  | "noStoredFile" | "schemaNotReady" | "unavailable" | "branchDenied" | "forbidden" | "notFound" | "cancelled" | "network" | "server";

const CODE_TO_KEY: Record<string, DocumentErrorKey> = {
  FILE_REQUIRED: "fileRequired",
  FILE_EMPTY: "fileEmpty",
  FILE_TOO_LARGE: "fileTooLarge",
  FILE_TYPE_INVALID: "fileTypeInvalid",
  FILE_SIGNATURE_UNSUPPORTED: "signatureUnsupported",
  FILE_SIGNATURE_MISMATCH: "signatureMismatch",
  UNSAFE_FILENAME: "unsafeName",
  FILE_FIELD_INVALID: "server",
  FILE_COUNT_INVALID: "server",
  ATTACHMENT_LIMIT_REACHED: "limitReached",
  IDEMPOTENCY_KEY_REUSED: "idempotencyReused",
  FILE_REJECTED_MALWARE: "malware",
  FILE_SCAN_UNAVAILABLE: "scanUnavailable",
  FILE_QUARANTINED: "quarantined",
  PRIVATE_STORAGE_UNAVAILABLE: "storageUnavailable",
  DOCUMENT_FILE_MISSING: "fileMissing",
  DOCUMENT_HAS_NO_STORED_FILE: "noStoredFile",
  SCHEMA_NOT_READY: "schemaNotReady",
  PERMISSION_OVERRIDES_UNAVAILABLE: "unavailable",
  BRANCH_ACCESS_DENIED: "branchDenied",
  INSUFFICIENT_PERMISSIONS: "forbidden",
};

interface ErrorShape {
  code?: string;
  name?: string;
  response?: { status?: number; data?: { code?: string } };
}

export const isCancellation = (error: unknown) => {
  const e = (error ?? {}) as ErrorShape;
  return e.code === "ERR_CANCELED" || e.name === "CanceledError" || e.name === "AbortError";
};

/** Classify an upload/download/delete failure by its stable code and status — never by the (English) message. */
export function documentErrorKey(error: unknown): DocumentErrorKey {
  if (isCancellation(error)) return "cancelled";
  const e = (error ?? {}) as ErrorShape;
  const res = e.response;
  if (!res) return "network";
  const mapped = res.data?.code ? CODE_TO_KEY[res.data.code] : undefined;
  if (mapped) return mapped;
  if (res.status === 401 || res.status === 403) return "forbidden";
  if (res.status === 404) return "notFound";
  if (res.status === 503) return "unavailable";
  return "server";
}
