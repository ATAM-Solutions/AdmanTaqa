import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();
const get = vi.fn();
vi.mock("@/api/config", () => ({ default: { post: (...a: unknown[]) => post(...a), get: (...a: unknown[]) => get(...a) } }));

import { assetService } from "./assetService";
import { documentErrorKey } from "@/lib/documentUploads";

beforeEach(() => { post.mockReset(); get.mockReset(); });

describe("assetService.uploadDocument", () => {
  it("posts multipart to the upload endpoint with file, title and clientRequestId in the BODY (no Idempotency-Key header, no forced Content-Type)", async () => {
    post.mockResolvedValue({ data: { data: { id: 7 }, idempotentReplay: true } });
    const ctl = new AbortController();
    const pct: (number | null)[] = [];
    const file = new File(["%PDF-1.4"], "m.pdf", { type: "application/pdf" });
    const out = await assetService.uploadDocument(5, { file, title: "  Manual ", clientRequestId: "req-abc-12345" }, { signal: ctl.signal, onProgress: (p) => pct.push(p) });
    const [url, form, cfg] = post.mock.calls[0] as [string, FormData, { headers?: Record<string, string>; signal: AbortSignal; onUploadProgress: (e: { loaded: number; total?: number }) => void }];
    expect(url).toBe("assets/5/documents/upload");
    expect(form).toBeInstanceOf(FormData);
    expect((form.get("file") as File).name).toBe("m.pdf");
    expect(form.get("title")).toBe("Manual");
    expect(form.get("clientRequestId")).toBe("req-abc-12345");
    expect(cfg.headers).toBeUndefined();
    expect(cfg.signal).toBe(ctl.signal);
    cfg.onUploadProgress({ loaded: 50, total: 200 });
    cfg.onUploadProgress({ loaded: 200, total: 200 });
    cfg.onUploadProgress({ loaded: 5 });
    expect(pct).toEqual([25, 100, null]);
    expect(out).toEqual({ document: { id: 7 }, replay: true });
  });
  it("omits an empty title", async () => {
    post.mockResolvedValue({ data: { data: { id: 1 } } });
    await assetService.uploadDocument(1, { file: new File(["x"], "a.pdf"), title: "   ", clientRequestId: "req-abc-12345" });
    expect((post.mock.calls[0][1] as FormData).has("title")).toBe(false);
  });
});

describe("assetService.fetchDocumentFile", () => {
  it("fetches a Blob through the authenticated client; ?download=1 only when downloading", async () => {
    get.mockResolvedValue({ data: new Blob(["x"]) });
    await assetService.fetchDocumentFile(3);
    expect(get).toHaveBeenLastCalledWith("assets/documents/3/file", expect.objectContaining({ responseType: "blob", params: undefined }));
    await assetService.fetchDocumentFile(3, { download: true });
    expect(get).toHaveBeenLastCalledWith("assets/documents/3/file", expect.objectContaining({ params: { download: 1 } }));
  });
  it("a failed request carries its parsed JSON code (quarantine, missing file)", async () => {
    get.mockRejectedValue({ response: { status: 403, data: new Blob([JSON.stringify({ code: "FILE_QUARANTINED" })]) } });
    const e = await assetService.fetchDocumentFile(3).catch((x) => x);
    expect(documentErrorKey(e)).toBe("quarantined");
    get.mockRejectedValue({ response: { status: 404, data: new Blob([JSON.stringify({ code: "DOCUMENT_FILE_MISSING" })]) } });
    expect(documentErrorKey(await assetService.fetchDocumentFile(3).catch((x) => x))).toBe("fileMissing");
  });
});
