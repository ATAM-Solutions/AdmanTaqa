import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assetService } from "@/api/services/assetService";
import { useAuth } from "@/context/AuthContext";
import { assetKeys, classifyAssetError, isTerminalAssetError } from "@/lib/assets";
import { HISTORY_PAGE_SIZE } from "@/lib/assetHistory";
import type {
  AssetListParams,
  CreateAssetBody,
  CreateAssetDocumentBody,
  CreateInspectionBody,
  CreateInternalMaintenanceBody,
  CreateWarrantyBody,
  UpdateAssetBody,
  UpdateWarrantyBody,
} from "@/types/asset";

/**
 * Asset Management data hooks. Every key carries the viewer's company (see `assetKeys`), so a cached list or detail
 * can never be shown to another company's session; 4xx answers (forbidden / not found / outside your stations) are
 * decisions, not blips, and are not retried.
 */
const retryPolicy = (failureCount: number, error: unknown) => !isTerminalAssetError(classifyAssetError(error).kind) && failureCount < 1;

const useOrgId = () => useAuth().organization?.id ?? null;

export function useAssetList(params: AssetListParams) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: assetKeys.list(orgId, params),
    queryFn: () => assetService.list(params),
    placeholderData: keepPreviousData,
    retry: retryPolicy,
  });
}

export function useAsset(id: number | string | undefined) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: assetKeys.detail(orgId, id ?? ""),
    queryFn: () => assetService.get(id!),
    enabled: id != null && id !== "",
    retry: retryPolicy,
  });
}

/**
 * The providers this asset's company may pick for a warranty (GET /assets/:id/warranty-providers: eligible and ACTIVE-linked
 * only, `assets.read` is enough, no station permissions). Loaded only while a form that needs it is open, and refetched every
 * time one opens, so a provider unlinked or deactivated meanwhile never lingers in the list. Not retried on 4xx.
 */
export function useWarrantyProviders(assetId: number | string, enabled = true) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: assetKeys.sub(orgId, assetId, "warrantyProviders"),
    queryFn: () => assetService.listWarrantyProviders(assetId),
    enabled,
    staleTime: 0,
    retry: retryPolicy,
  });
}

/** Refresh everything asset-related after a change (including the older station/asset dropdown hook, key ["assets", …]). */
function useInvalidateAssets() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["assets"] });
}

export function useCreateAsset() {
  const invalidate = useInvalidateAssets();
  return useMutation({ mutationFn: (body: CreateAssetBody) => assetService.create(body), onSuccess: invalidate });
}

export function useUpdateAsset(id: number | string) {
  const invalidate = useInvalidateAssets();
  return useMutation({ mutationFn: (body: UpdateAssetBody) => assetService.update(id, body), onSuccess: invalidate });
}

export type AssetSubKind = "documents" | "warranties" | "warrantyProviders" | "inspections" | "maintenance" | "history";

function useRecordsQuery<T>(kind: AssetSubKind, assetId: number | string, fetcher: (id: number | string) => Promise<T[]>) {
  const orgId = useOrgId();
  return useQuery({ queryKey: assetKeys.sub(orgId, assetId, kind), queryFn: () => fetcher(assetId), retry: retryPolicy });
}

// Only mounted tabs fetch (inactive tabs are unmounted), so opening an asset loads just what is looked at.
export const useAssetDocuments = (id: number | string) => useRecordsQuery("documents", id, assetService.listDocuments);
export const useAssetWarranties = (id: number | string) => useRecordsQuery("warranties", id, assetService.listWarranties);
export const useAssetInspections = (id: number | string) => useRecordsQuery("inspections", id, assetService.listInspections);
export const useAssetMaintenance = (id: number | string) => useRecordsQuery("maintenance", id, assetService.listMaintenance);
/**
 * Query options of the asset's activity timeline, newest first, loaded page by page. The key carries the company AND the
 * asset, so switching either starts again from the first page (a cursor never leaks into another asset or company); the
 * backend only hands out a cursor when more exists.
 */
export const assetHistoryOptions = (orgId: number | null | undefined, id: number | string) => ({
  queryKey: assetKeys.sub(orgId, id, "history"),
  queryFn: ({ pageParam }: { pageParam: string | null }) => assetService.listHistory(id, { limit: HISTORY_PAGE_SIZE, cursor: pageParam }),
  initialPageParam: null as string | null,
  getNextPageParam: (last: { page: { hasMore: boolean; nextCursor: string | null } }) => (last.page.hasMore ? last.page.nextCursor : undefined),
  retry: retryPolicy,
});

export const useAssetHistory = (id: number | string) => useInfiniteQuery(assetHistoryOptions(useOrgId(), id));

function useRecordMutation<V, R>(assetId: number | string, kind: AssetSubKind, fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assetKeys.sub(orgId, assetId, kind) });
      qc.invalidateQueries({ queryKey: assetKeys.sub(orgId, assetId, "history") }); // every record change is an event
      // counters on the General tab (documentCount, maintenanceHistoryCount) come from the detail response
      qc.invalidateQueries({ queryKey: assetKeys.detail(orgId, assetId), exact: true });
    },
  });
}

export const useCreateAssetDocument = (assetId: number | string) =>
  useRecordMutation(assetId, "documents", (b: CreateAssetDocumentBody) => assetService.createDocument(assetId, b));
export const useDeleteAssetDocument = (assetId: number | string) =>
  useRecordMutation(assetId, "documents", (docId: number) => assetService.deleteDocument(docId));
export const useCreateWarranty = (assetId: number | string) =>
  useRecordMutation(assetId, "warranties", (b: CreateWarrantyBody) => assetService.createWarranty(assetId, b));
export const useUpdateWarranty = (assetId: number | string) =>
  useRecordMutation(assetId, "warranties", ({ id, body }: { id: number; body: UpdateWarrantyBody }) => assetService.updateWarranty(assetId, id, body));
export const useCreateInspection = (assetId: number | string) =>
  useRecordMutation(assetId, "inspections", (b: CreateInspectionBody) => assetService.createInspection(assetId, b));
export const useCreateMaintenance = (assetId: number | string) =>
  useRecordMutation(assetId, "maintenance", (b: CreateInternalMaintenanceBody) => assetService.createMaintenance(assetId, b));

/** Refreshes the documents list (and the General-tab counters) after an upload the API confirmed. */
export function useDocumentUploadCompleted(assetId: number | string) {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return () => {
    qc.invalidateQueries({ queryKey: assetKeys.sub(orgId, assetId, "documents") });
    qc.invalidateQueries({ queryKey: assetKeys.sub(orgId, assetId, "history") });
    qc.invalidateQueries({ queryKey: assetKeys.detail(orgId, assetId), exact: true });
  };
}
