import { describe, expect, it, vi } from "vitest";
import {
  DOCUMENT_UPLOAD_MAX_BYTES, ObjectUrlRegistry, documentActions, documentErrorKey, downloadFileNameFor, formatFileSize,
  hasUnsafeFileName, nextClientRequestId, previewKind, validateUploadFile,
} from "./documentUploads";
import { withParsedBlobError } from "./blobErrors";

const f = (name: string, size: number, type: string) => ({ name, size, type });

describe("file validation", () => {
  it("accepts PDF and the four image types up to exactly 15MB", () => {
    for (const t of ["application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp"]) expect(validateUploadFile(f("a.x", 10, t))).toBeNull();
    expect(validateUploadFile(f("a.pdf", DOCUMENT_UPLOAD_MAX_BYTES, "application/pdf"))).toBeNull();
  });
  it("rejects empty, oversized, other types (incl. HEIC) and unsafe names", () => {
    expect(validateUploadFile(f("a.pdf", 0, "application/pdf"))?.key).toBe("empty");
    expect(validateUploadFile(f("a.pdf", DOCUMENT_UPLOAD_MAX_BYTES + 1, "application/pdf"))).toEqual({ key: "tooLarge", maxMb: 15 });
    expect(validateUploadFile(f("a.heic", 10, "image/heic"))?.key).toBe("typeInvalid");
    expect(validateUploadFile(f("a.docx", 10, ""))?.key).toBe("typeInvalid");
    for (const n of ["report.pdf.php", "report.php.pdf", "invoice.exe", "x.sh"]) expect(validateUploadFile(f(n, 10, "application/pdf"))?.key).toBe("unsafeName");
    expect(hasUnsafeFileName("manual.v2.pdf")).toBe(false);
    expect(hasUnsafeFileName("C:\\fake\\a.pdf")).toBe(false);
  });
  it("formats sizes in the user's numerals", () => {
    expect(formatFileSize(512, "en")).toBe("512 B");
    expect(formatFileSize(1536, "en")).toBe("1.5 KB");
    expect(formatFileSize(15 * 1024 * 1024, "en")).toBe("15 MB");
    expect(formatFileSize(null, "en")).toBe("");
  });
});

describe("retry key", () => {
  let n = 0;
  const make = () => `id-${++n}`;
  const file = { name: "a.pdf", size: 5, lastModified: 1 };
  it("keeps the key for the same file and creates a new one for another file or a new operation", () => {
    const first = nextClientRequestId(null, file, make);
    expect(nextClientRequestId(first, { ...file }, make)).toBe(first);
    expect(nextClientRequestId(first, { ...file, size: 6 }, make).id).not.toBe(first.id);
    expect(nextClientRequestId(null, file, make).id).not.toBe(first.id);
  });
});

describe("what each document may offer", () => {
  const up = (mimeType: string, scanStatus: "NOT_SCANNED" | "CLEAN" | "INFECTED" | "SCAN_FAILED") => documentActions({ source: "UPLOAD", fileUrl: null, mimeType, scanStatus });
  it("images preview + download; unscanned PDFs are download-only; CLEAN PDFs preview", () => {
    expect(up("image/png", "NOT_SCANNED")).toMatchObject({ preview: true, download: true, pdfDownloadOnly: false });
    expect(up("application/pdf", "NOT_SCANNED")).toMatchObject({ preview: false, download: true, pdfDownloadOnly: true });
    expect(up("application/pdf", "CLEAN")).toMatchObject({ preview: true, download: true, pdfDownloadOnly: false });
  });
  it("INFECTED / SCAN_FAILED offer nothing", () => {
    for (const s of ["INFECTED", "SCAN_FAILED"] as const) expect(up("image/png", s)).toMatchObject({ preview: false, download: false, blocked: true });
  });
  it("links (and pre-3D.1 rows without `source`) behave as before; unsafe links offer nothing", () => {
    expect(documentActions({ fileUrl: "https://x.test/a.pdf", mimeType: undefined, scanStatus: undefined, source: undefined })).toMatchObject({ source: "LINK", openLink: true, preview: false, download: false });
    expect(documentActions({ source: "LINK", fileUrl: "javascript:alert(1)" }).openLink).toBe(false);
  });
  it("previews only verified types; download names use the verified extension", () => {
    expect(previewKind("text/html")).toBeNull();
    expect(previewKind("image/svg+xml")).toBeNull();
    expect(previewKind("application/pdf")).toBe("pdf");
    expect(downloadFileNameFor({ id: 4, originalName: "../../evil.php", title: null, mimeType: "image/png" })).toBe("evil.png");
    expect(downloadFileNameFor({ id: 4, originalName: null, title: null, mimeType: "application/pdf" })).toBe("document-4.pdf");
  });
});

describe("object URLs", () => {
  it("revokes every URL (now, on a timer, and on unmount)", () => {
    vi.useFakeTimers();
    let n = 0;
    const revoked: string[] = [];
    const reg = new ObjectUrlRegistry({ create: () => `blob:${++n}`, revoke: (u) => revoked.push(u) });
    const a = reg.create(new Blob(["a"]));
    const b = reg.create(new Blob(["b"]));
    const c = reg.create(new Blob(["c"]));
    reg.revoke(a);
    reg.revoke(a); // idempotent
    reg.revokeLater(b, 1000);
    vi.advanceTimersByTime(1000);
    expect(revoked).toEqual([a, b]);
    reg.revokeAll();
    expect(revoked).toEqual([a, b, c]);
    expect(reg.size).toBe(0);
    vi.useRealTimers();
  });
});

describe("error classification (by stable code, never by message)", () => {
  const err = (status: number, code?: string) => ({ response: { status, data: { code } } });
  it("maps every documented code", () => {
    const cases: Record<string, string> = {
      FILE_REQUIRED: "fileRequired", FILE_EMPTY: "fileEmpty", FILE_TOO_LARGE: "fileTooLarge", FILE_TYPE_INVALID: "fileTypeInvalid",
      FILE_SIGNATURE_UNSUPPORTED: "signatureUnsupported", FILE_SIGNATURE_MISMATCH: "signatureMismatch", UNSAFE_FILENAME: "unsafeName",
      ATTACHMENT_LIMIT_REACHED: "limitReached", IDEMPOTENCY_KEY_REUSED: "idempotencyReused", FILE_REJECTED_MALWARE: "malware",
      FILE_SCAN_UNAVAILABLE: "scanUnavailable", FILE_QUARANTINED: "quarantined", PRIVATE_STORAGE_UNAVAILABLE: "storageUnavailable",
      DOCUMENT_FILE_MISSING: "fileMissing", SCHEMA_NOT_READY: "schemaNotReady", BRANCH_ACCESS_DENIED: "branchDenied", INSUFFICIENT_PERMISSIONS: "forbidden",
    };
    for (const [code, key] of Object.entries(cases)) expect(documentErrorKey(err(400, code))).toBe(key);
  });
  it("falls back by status; network and cancellation are distinct", () => {
    expect(documentErrorKey(err(403))).toBe("forbidden");
    expect(documentErrorKey(err(404))).toBe("notFound");
    expect(documentErrorKey(err(503))).toBe("unavailable");
    expect(documentErrorKey(err(500))).toBe("server");
    expect(documentErrorKey({ message: "Network Error" })).toBe("network");
    expect(documentErrorKey({ code: "ERR_CANCELED", name: "CanceledError" })).toBe("cancelled");
  });
  it("reads the JSON error body of a failed blob request", async () => {
    const e = { response: { status: 403, data: new Blob([JSON.stringify({ code: "FILE_QUARANTINED" })]) } };
    expect(documentErrorKey(await withParsedBlobError(e))).toBe("quarantined");
    const bad = { response: { status: 500, data: new Blob(["<html>"]) } };
    expect(documentErrorKey(await withParsedBlobError(bad))).toBe("server");
  });
});
