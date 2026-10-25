import { describe, expect, it } from "vitest";
import { UploadSession, type UploadFn } from "./uploadSession";
import type { AssetDocument } from "@/types/asset";

const doc = { id: 9, assetId: 1, fileUrl: null, fileType: "PDF", title: null, uploadedByUserId: 1, createdAt: "" } as AssetDocument;
const pdf = (name = "a.pdf", size = 20) => new File([new Uint8Array(size).fill(1)], name, { type: "application/pdf", lastModified: 1_700_000_000_000 });
const deferred = () => { let resolve!: (v: { document: AssetDocument; replay: boolean }) => void; let reject!: (e: unknown) => void; const promise = new Promise<{ document: AssetDocument; replay: boolean }>((res, rej) => { resolve = res; reject = rej; }); return { promise, resolve, reject }; };
let counter = 0;
const ids = () => `req-${++counter}`;

describe("UploadSession", () => {
  it("rejects invalid files without a request", async () => {
    const calls: unknown[] = [];
    const s = new UploadSession(async (i) => { calls.push(i); return { document: doc, replay: false }; }, ids);
    s.select(new File(["x"], "a.heic", { type: "image/heic" }));
    expect(s.getState().fileError?.key).toBe("typeInvalid");
    expect(await s.start()).toBeNull();
    s.select(pdf("a.pdf", 0));
    expect(s.getState().fileError?.key).toBe("empty");
    expect(calls).toHaveLength(0);
  });

  it("sends file, title and a clientRequestId; success only after the API answered", async () => {
    const d = deferred();
    let sent: Parameters<UploadFn>[0] | undefined;
    const s = new UploadSession((i, o) => { sent = i; o.onProgress(40); return d.promise; }, ids);
    s.select(pdf());
    const run = s.start("Manual");
    expect(s.getState()).toMatchObject({ phase: "uploading", progress: 40 });
    expect(s.getState().phase).not.toBe("success");
    d.resolve({ document: doc, replay: false });
    expect(await run).toBe(doc);
    expect(s.getState()).toMatchObject({ phase: "success", progress: 100, replay: false });
    expect(sent?.title).toBe("Manual");
    expect(sent?.clientRequestId).toMatch(/^req-/);
  });

  it("ignores a second submit while uploading (no duplicate)", async () => {
    const d = deferred();
    let calls = 0;
    const s = new UploadSession(() => { calls += 1; return d.promise; }, ids);
    s.select(pdf());
    const first = s.start();
    expect(await s.start()).toBeNull();
    expect(calls).toBe(1);
    d.resolve({ document: doc, replay: false });
    await first;
  });

  it("a retry after a network failure re-sends the SAME clientRequestId; a different file or new operation gets a new one", async () => {
    const seen: string[] = [];
    let fail = true;
    const s = new UploadSession(async (i) => { seen.push(i.clientRequestId); if (fail) throw Object.assign(new Error("Network Error"), {}); return { document: doc, replay: true }; }, ids);
    s.select(pdf());
    await s.start();
    expect(s.getState()).toMatchObject({ phase: "error", errorKey: "network" });
    fail = false;
    await s.start();
    expect(seen[0]).toBe(seen[1]);
    expect(s.getState().replay).toBe(true);
    // re-picking the same file keeps the key too
    s.select(pdf());
    expect(s.getState().clientRequestId).toBe(seen[0]);
    s.select(pdf("other.pdf", 33));
    expect(s.getState().clientRequestId).not.toBe(seen[0]);
    // a finished operation: next upload is a new one even for an identical file
    s.select(pdf());
    s.reset();
    s.select(pdf());
    expect(s.getState().clientRequestId).not.toBe(seen[0]);
  });

  it("cancel aborts the request; the file and key are kept for a safe retry", async () => {
    let signal: AbortSignal | undefined;
    const keys: string[] = [];
    const s = new UploadSession((i, o) => { signal = o.signal; keys.push(i.clientRequestId); return new Promise((_, rej) => o.signal.addEventListener("abort", () => rej(Object.assign(new Error("canceled"), { code: "ERR_CANCELED", name: "CanceledError" })))); }, ids);
    s.select(pdf());
    const run = s.start();
    s.cancel();
    await run;
    expect(signal?.aborted).toBe(true);
    expect(s.getState()).toMatchObject({ phase: "cancelled", errorKey: null });
    expect(s.getState().file).not.toBeNull();
    await Promise.race([s.start(), Promise.resolve()]).catch(() => {});
    s.cancel();
    expect(keys.length).toBeGreaterThanOrEqual(2);
    expect(keys[0]).toBe(keys[1]);
  });

  it("surfaces API error codes and the file can't change under a running upload", async () => {
    const d = deferred();
    const s = new UploadSession(() => d.promise, ids);
    s.select(pdf());
    const run = s.start();
    s.select(pdf("sneaky.pdf"));
    expect(s.getState().file?.name).toBe("a.pdf");
    d.reject({ response: { status: 400, data: { code: "ATTACHMENT_LIMIT_REACHED" } } });
    await run;
    expect(s.getState()).toMatchObject({ phase: "error", errorKey: "limitReached" });
  });
});
