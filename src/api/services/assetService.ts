import axiosInstance from "@/api/config";
import { withParsedBlobError } from "@/lib/blobErrors";
import type {
  Asset,
  AssetDetail,
  AssetDocument,
  AssetHistoryEvent,
  AssetHistoryPage,
  AssetInspection,
  AssetListParams,
  CreateAssetBody,
  CreateAssetDocumentBody,
  CreateInspectionBody,
  CreateInternalMaintenanceBody,
  CreateWarrantyBody,
  InternalMaintenanceRecord,
  UpdateAssetBody,
  UpdateWarrantyBody,
  WarrantyProviderOption,
  WarrantyRecord,
} from "@/types/asset";

interface Envelope<T> {
  success?: boolean;
  data: T;
  message?: string;
}
const unwrap = <T>(res: { data: Envelope<T> }): T => res.data.data;
const asList = <T>(value: T[] | null | undefined): T[] => (Array.isArray(value) ? value : []);

/**
 * Existing asset endpoints, used as they are (no new contracts). Errors are rethrown untouched (axios errors): the
 * UI classifies them by stable status/code (see lib/assets.ts).
 */
export const assetService = {
  // Assets
  list(params: AssetListParams = {}) {
    const query: Record<string, string | number> = {};
    if (params.branchId != null) query.branchId = params.branchId;
    if (params.search?.trim()) query.search = params.search.trim();
    return axiosInstance.get<Envelope<Asset[]>>("assets", { params: query }).then(unwrap).then(asList);
  },
  get(id: number | string) {
    return axiosInstance.get<Envelope<AssetDetail>>(`assets/${id}`).then(unwrap);
  },
  create(body: CreateAssetBody) {
    return axiosInstance.post<Envelope<Asset>>("assets", body).then(unwrap);
  },
  update(id: number | string, body: UpdateAssetBody) {
    return axiosInstance.patch<Envelope<Asset>>(`assets/${id}`, body).then(unwrap);
  },

  // Documents (registered by URL — there is no multipart upload for asset documents)
  listDocuments(assetId: number | string) {
    return axiosInstance.get<Envelope<AssetDocument[]>>(`assets/${assetId}/documents`).then(unwrap).then(asList);
  },
  createDocument(assetId: number | string, body: CreateAssetDocumentBody) {
    return axiosInstance.post<Envelope<AssetDocument>>(`assets/${assetId}/documents`, body).then(unwrap);
  },
  /**
   * POST /assets/:id/documents/upload — multipart: `file`, optional `title`, `clientRequestId` (the retry key; sent as a form
   * field because the backend's CORS configuration does not allow the Idempotency-Key header). The Content-Type (with its
   * multipart boundary) is left to the browser. `replay` is true when the backend recognised a retry of an earlier upload.
   */
  async uploadDocument(
    assetId: number | string,
    input: { file: File; title?: string; clientRequestId: string },
    options: { onProgress?: (percent: number | null) => void; signal?: AbortSignal } = {}
  ) {
    const form = new FormData();
    form.append("file", input.file);
    if (input.title?.trim()) form.append("title", input.title.trim());
    form.append("clientRequestId", input.clientRequestId);
    const res = await axiosInstance.post<Envelope<AssetDocument> & { idempotentReplay?: boolean }>(`assets/${assetId}/documents/upload`, form, {
      signal: options.signal,
      onUploadProgress: (e) => options.onProgress?.(e.total ? Math.min(100, Math.round((e.loaded * 100) / e.total)) : null),
    });
    return { document: res.data.data, replay: res.data.idempotentReplay === true };
  },
  /**
   * GET /assets/documents/:docId/file — the stored file as a Blob, fetched with the normal login header (a protected download
   * can never be opened through a plain link or <img>). `download` asks the backend for an attachment. A failed request is
   * rethrown with its JSON error body already parsed (the error body of a blob request is itself a Blob).
   */
  async fetchDocumentFile(docId: number | string, options: { download?: boolean; signal?: AbortSignal } = {}) {
    try {
      const res = await axiosInstance.get<Blob>(`assets/documents/${docId}/file`, {
        responseType: "blob",
        params: options.download ? { download: 1 } : undefined,
        signal: options.signal,
      });
      return res.data;
    } catch (error) {
      throw await withParsedBlobError(error);
    }
  },
  deleteDocument(docId: number | string) {
    return axiosInstance.delete<Envelope<unknown>>(`assets/documents/${docId}`).then(() => undefined);
  },

  // Warranties
  /** Eligible, ACTIVE-linked providers of the asset's company (needs assets.read only, no station permissions). */
  listWarrantyProviders(assetId: number | string) {
    return axiosInstance.get<Envelope<WarrantyProviderOption[]>>(`assets/${assetId}/warranty-providers`).then(unwrap).then(asList);
  },
  listWarranties(assetId: number | string) {
    return axiosInstance.get<Envelope<WarrantyRecord[]>>(`assets/${assetId}/warranties`).then(unwrap).then(asList);
  },
  createWarranty(assetId: number | string, body: CreateWarrantyBody) {
    return axiosInstance.post<Envelope<WarrantyRecord>>(`assets/${assetId}/warranties`, body).then(unwrap);
  },
  updateWarranty(assetId: number | string, id: number | string, body: UpdateWarrantyBody) {
    return axiosInstance.patch<Envelope<WarrantyRecord>>(`assets/${assetId}/warranties/${id}`, body).then(unwrap);
  },

  // Inspections
  listInspections(assetId: number | string) {
    return axiosInstance.get<Envelope<AssetInspection[]>>(`assets/${assetId}/inspections`).then(unwrap).then(asList);
  },
  createInspection(assetId: number | string, body: CreateInspectionBody) {
    return axiosInstance.post<Envelope<AssetInspection>>(`assets/${assetId}/inspections`, body).then(unwrap);
  },

  // Internal maintenance
  listMaintenance(assetId: number | string) {
    return axiosInstance.get<Envelope<InternalMaintenanceRecord[]>>(`assets/${assetId}/internal-maintenance`).then(unwrap).then(asList);
  },
  createMaintenance(assetId: number | string, body: CreateInternalMaintenanceBody) {
    return axiosInstance.post<Envelope<InternalMaintenanceRecord>>(`assets/${assetId}/internal-maintenance`, body).then(unwrap);
  },

  // History
  /**
   * GET /assets/:id/history — one newest-first page. `data` stays an array; `page` carries the cursor for the next one.
   * (A response from before the paging release has no `page`: it is treated as the last page.)
   */
  async listHistory(assetId: number | string, params: { limit?: number; cursor?: string | null } = {}) {
    const res = await axiosInstance.get<Envelope<AssetHistoryEvent[]> & { page?: AssetHistoryPage }>(`assets/${assetId}/history`, {
      params: { ...(params.limit ? { limit: params.limit } : {}), ...(params.cursor ? { cursor: params.cursor } : {}) },
    });
    const page = res.data.page;
    return {
      events: asList(res.data.data),
      page: { limit: page?.limit ?? 0, hasMore: page?.hasMore === true && !!page.nextCursor, nextCursor: page?.nextCursor ?? null } satisfies AssetHistoryPage,
    };
  },
};
