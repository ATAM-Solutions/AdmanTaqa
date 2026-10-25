import { documentErrorKey, isCancellation, nextClientRequestId, validateUploadFile, type DocumentErrorKey, type FileCheckError } from "@/lib/documentUploads";
import type { AssetDocument } from "@/types/asset";

/**
 * One document-upload form's state machine, independent of React (so its rules are unit-tested directly).
 *
 *  - Choosing a file validates it and fixes the RETRY KEY (clientRequestId). Choosing the same file again keeps the key;
 *    choosing another file makes a new one.
 *  - A failed or cancelled attempt keeps the file AND the key, so "Retry" after a dropped connection re-sends the same
 *    request id and the backend returns the already-stored document instead of creating a duplicate.
 *  - `start()` is ignored while an upload is running (no accidental double submit); `cancel()` aborts the request.
 *  - `success` is reached ONLY after the API confirmed; `reset()` ends the operation, so the next upload gets a new key.
 */
export type UploadPhase = "idle" | "uploading" | "success" | "error" | "cancelled";

export interface UploadState {
  file: File | null;
  fileError: FileCheckError | null;
  phase: UploadPhase;
  /** 0–100, or null when the browser cannot tell */
  progress: number | null;
  errorKey: DocumentErrorKey | null;
  /** the backend recognised this as a retry of an upload it already stored */
  replay: boolean;
  document: AssetDocument | null;
  clientRequestId: string | null;
}

export type UploadFn = (
  input: { file: File; title?: string; clientRequestId: string },
  options: { onProgress: (percent: number | null) => void; signal: AbortSignal }
) => Promise<{ document: AssetDocument; replay: boolean }>;

const INITIAL: UploadState = { file: null, fileError: null, phase: "idle", progress: null, errorKey: null, replay: false, document: null, clientRequestId: null };

export class UploadSession {
  private state: UploadState = INITIAL;
  private listeners = new Set<() => void>();
  private controller: AbortController | null = null;
  private keyed: { fileKey: string; id: string } | null = null;

  private upload: UploadFn;
  private makeId: (() => string) | undefined;
  constructor(upload: UploadFn, makeId?: () => string) {
    this.upload = upload;
    this.makeId = makeId;
  }

  getState = () => this.state;
  subscribe = (l: () => void) => { this.listeners.add(l); return () => { this.listeners.delete(l); }; };
  private set(patch: Partial<UploadState>) {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l();
  }

  select(file: File | null) {
    if (this.state.phase === "uploading") return; // the chosen file cannot change under a running upload
    if (!file) { this.keyed = null; this.set({ ...INITIAL }); return; }
    const fileError = validateUploadFile(file);
    this.keyed = fileError ? null : nextClientRequestId(this.keyed, file, this.makeId);
    this.set({ file, fileError, phase: "idle", progress: null, errorKey: null, replay: false, document: null, clientRequestId: this.keyed?.id ?? null });
  }

  async start(title?: string): Promise<AssetDocument | null> {
    const { file, fileError, phase } = this.state;
    if (phase === "uploading") return null;          // duplicate submission guard
    if (!file || fileError || !this.keyed) return null;
    const controller = new AbortController();
    this.controller = controller;
    this.set({ phase: "uploading", progress: 0, errorKey: null, replay: false });
    try {
      const result = await this.upload(
        { file, title, clientRequestId: this.keyed.id },
        { onProgress: (p) => { if (this.controller === controller) this.set({ progress: p }); }, signal: controller.signal }
      );
      this.set({ phase: "success", progress: 100, document: result.document, replay: result.replay });
      return result.document;
    } catch (error) {
      if (isCancellation(error)) this.set({ phase: "cancelled", progress: null, errorKey: null });
      else this.set({ phase: "error", progress: null, errorKey: documentErrorKey(error) });
      return null;
    } finally {
      if (this.controller === controller) this.controller = null;
    }
  }

  cancel() { this.controller?.abort(); }

  /** Ends the operation (after success, or when the form is closed): the next upload is a NEW operation with a NEW key. */
  reset() {
    this.controller?.abort();
    this.keyed = null;
    this.set({ ...INITIAL });
  }
}
