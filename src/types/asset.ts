/**
 * Asset Management contracts, taken from the backend as it is (enrgy-BE: models, zod schemas, controllers).
 * Nothing here is invented: every field exists in the API response or request schema.
 */

export const ASSET_STATUSES = ["ACTIVE", "UNDER_MAINTENANCE", "INACTIVE", "DECOMMISSIONED"] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const MAINTENANCE_TYPES = ["INTERNAL", "EXTERNAL"] as const;
export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number];

/** `Branch` as included in GET /assets (list: id + names only; detail: the whole station row). */
export interface AssetBranchRef {
  id: number;
  nameEn?: string | null;
  nameAr?: string | null;
}

/** An asset as returned by GET /assets (list), GET /assets/:id, POST and PATCH. Dates are DATEONLY strings (YYYY-MM-DD). */
export interface Asset {
  id: number;
  branchId: number;
  name: string;
  maintenanceType: MaintenanceType;
  description: string | null;
  type: string | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  location: string | null;
  installationDate: string | null;
  purchaseDate: string | null;
  /** DECIMAL(12,2): the API may send it as a string. */
  purchaseCost: number | string | null;
  warrantyExpiry: string | null;
  status: AssetStatus;
  createdAt?: string;
  updatedAt?: string;
  /** Present on GET /assets and GET /assets/:id (not on POST / PATCH responses). */
  Branch?: AssetBranchRef | null;
}

/** GET /assets/:id adds these computed values. */
export interface AssetDetail extends Asset {
  healthScore?: number;
  lastMaintenanceDate?: string | null;
  nextMaintenanceDate?: string | null;
  maintenanceHistoryCount?: number;
  documentCount?: number;
  workOrderCount?: number;
}

export interface AssetListParams {
  branchId?: number;
  search?: string;
}

/** POST /assets body (createAssetSchema): optional fields are OMITTED when empty — null is not accepted. */
export interface CreateAssetBody {
  branchId: number;
  name: string;
  maintenanceType: MaintenanceType;
  description?: string;
  type?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  location?: string;
  installationDate?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  warrantyExpiry?: string;
  status?: AssetStatus;
}

/** PATCH /assets/:id body (updateAssetSchema). `branchId` is NOT editable. Optional text/date/cost fields accept null to clear. */
export interface UpdateAssetBody {
  name?: string;
  maintenanceType?: MaintenanceType;
  description?: string | null;
  type?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  location?: string | null;
  installationDate?: string | null;
  purchaseDate?: string | null;
  purchaseCost?: number | null;
  warrantyExpiry?: string | null;
  status?: AssetStatus;
}

/** How a document is held. LINK: a URL the user registered. UPLOAD: a file in the backend's PRIVATE storage. */
export type DocumentSource = "LINK" | "UPLOAD";
/** Honest malware-scan state. NOT_SCANNED is the normal state today (the backend has no scanner) — never "clean". */
export type ScanStatus = "NOT_SCANNED" | "CLEAN" | "INFECTED" | "SCAN_FAILED";

/**
 * GET /assets/:id/documents (Phase 3D.1 contract). `fileUrl` is the registered link for LINK documents and null for
 * uploads; storage keys / filesystem paths are never part of the response. The upload-related fields are optional so a
 * response from before 3D.1 (no `source`) still reads as a link.
 */
export interface AssetDocument {
  id: number;
  assetId: number;
  source?: DocumentSource;
  fileUrl: string | null;
  fileType: string | null;
  title: string | null;
  originalName?: string | null;
  /** The type verified from the file's content. */
  mimeType?: string | null;
  sizeBytes?: number | null;
  sha256?: string | null;
  scanStatus?: ScanStatus;
  /** LINK: the link. UPLOAD: the authenticated download endpoint — never to be opened directly (it needs the login header). */
  downloadUrl?: string | null;
  uploadedByUserId: number;
  createdAt: string;
  UploadedByUser?: { id: number; fullName: string } | null;
}
export interface CreateAssetDocumentBody {
  fileUrl: string;
  fileType?: string;
  title?: string;
}

/** How a warranty's provider stands today (computed by the API for the asset's company). */
export type WarrantyProviderState = "ELIGIBLE" | "INACTIVE" | "UNLINKED" | "UNAVAILABLE";
/** Safe provider display on a warranty. UNAVAILABLE carries no names (missing or not a service provider). */
export interface WarrantyProviderDisplay {
  id: number;
  name: string | null;
  nameAr: string | null;
  state: WarrantyProviderState;
}
/** One entry of GET /assets/:id/warranty-providers: an eligible, ACTIVE-linked provider of the asset's company. */
export interface WarrantyProviderOption {
  id: number;
  name: string | null;
  nameAr: string | null;
}

/** GET /assets/:id/warranties. `provider` is absent only on an older API: the organization id is then all there is. */
export interface WarrantyRecord {
  id: number;
  assetId: number;
  providerOrganizationId: number;
  startDate: string;
  endDate: string;
  provider?: WarrantyProviderDisplay;
}
export interface CreateWarrantyBody {
  providerOrganizationId: number;
  startDate: string;
  endDate: string;
}
/** PATCH: send only what changed. A provider change needs `assets.update` and is fully revalidated by the API. */
export interface UpdateWarrantyBody {
  providerOrganizationId?: number;
  startDate?: string;
  endDate?: string;
}

/** GET /assets/:id/inspections */
export interface AssetInspection {
  id: number;
  assetId: number;
  inspectionDate: string;
  status: string | null;
  notes: string | null;
}
export interface CreateInspectionBody {
  inspectionDate: string;
  status?: string;
  notes?: string;
}

/** GET /assets/:id/internal-maintenance (`performedByName` is added by the controller). */
export interface InternalMaintenanceRecord {
  id: number;
  assetId: number;
  performedByUserId: number;
  performedAt: string;
  notes: string | null;
  performedByName: string | null;
}
export interface CreateInternalMaintenanceBody {
  /** ISO-8601 datetime (zod `z.string().datetime()`), e.g. 2026-10-22T08:30:00.000Z */
  performedAt: string;
  notes?: string;
}

/** Where a history event comes from: the audit trail, or an older AssetHistory row. */
export type HistorySource = "audit" | "legacy";

/**
 * GET /assets/:id/history (Phase 3E.1). `details` is ALREADY sanitised by the backend (allowlisted fields only) and is null
 * for legacy rows; its shape depends on `eventType`, so every field is optional and read defensively. `id` is only unique
 * within a `source` — key on `eventId`. `eventType` may be a code this dashboard does not know.
 */
export interface AssetHistoryEvent {
  eventId: string;
  id: number;
  assetId: number;
  organizationId: number;
  performedByUserId: number | null;
  actorName: string | null;
  eventType: string;
  source: HistorySource;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface AssetHistoryPage {
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
}
