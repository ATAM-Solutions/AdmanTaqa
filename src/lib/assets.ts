import {
  ASSET_STATUSES,
  MAINTENANCE_TYPES,
  type Asset,
  type AssetListParams,
  type AssetStatus,
  type CreateAssetBody,
  type CreateAssetDocumentBody,
  type CreateInspectionBody,
  type CreateInternalMaintenanceBody,
  type CreateWarrantyBody,
  type MaintenanceType,
  type UpdateAssetBody,
  type UpdateWarrantyBody,
  type WarrantyProviderOption,
  type WarrantyProviderState,
  type WarrantyRecord,
} from "@/types/asset";

/**
 * Pure rules for the Asset Management section. The BACKEND stays authoritative (company and station isolation,
 * permissions, validation, duplicate serial numbers); everything here only decides what to show, validates before
 * a request is worth sending, and shapes request bodies exactly as the existing zod schemas accept them.
 */

// ── permissions ──────────────────────────────────────────────────────────────────────────────────────────────────

export interface AssetCapabilities {
  /** assets.read — see assets and their records. */
  read: boolean;
  /** assets.create — create NEW assets. */
  create: boolean;
  /** assets.update — edit an asset (and a warranty's dates). */
  update: boolean;
  /** assets.manage_records OR assets.create — add warranties / inspections / internal maintenance / documents. */
  manageRecords: boolean;
  /** assets.delete — the only delete the backend offers: removing an asset DOCUMENT. */
  deleteDocument: boolean;
}

/** Derived from the permissions /auth/me returned for THIS session; the backend re-checks every call. */
export function assetCapabilities(has: (code: string) => boolean): AssetCapabilities {
  return {
    read: has("assets.read"),
    create: has("assets.create"),
    update: has("assets.update"),
    manageRecords: has("assets.manage_records") || has("assets.create"),
    deleteDocument: has("assets.delete"),
  };
}

// ── form model ───────────────────────────────────────────────────────────────────────────────────────────────────

export interface AssetFormValues {
  branchId: string;
  name: string;
  maintenanceType: MaintenanceType | "";
  description: string;
  type: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  location: string;
  installationDate: string;
  purchaseDate: string;
  purchaseCost: string;
  warrantyExpiry: string;
  status: AssetStatus;
}
export type AssetFormField = keyof AssetFormValues;

export const emptyAssetForm = (defaults: Partial<AssetFormValues> = {}): AssetFormValues => ({
  branchId: "",
  name: "",
  maintenanceType: "",
  description: "",
  type: "",
  manufacturer: "",
  model: "",
  serialNumber: "",
  location: "",
  installationDate: "",
  purchaseDate: "",
  purchaseCost: "",
  warrantyExpiry: "",
  status: "ACTIVE",
  ...defaults,
});

const dateOnly = (v: string | null | undefined) => (v ? String(v).slice(0, 10) : "");

/** Populate the edit form from the asset as the API returned it. */
export function assetToForm(asset: Asset): AssetFormValues {
  const cost = asset.purchaseCost;
  return {
    branchId: String(asset.branchId),
    name: asset.name ?? "",
    maintenanceType: asset.maintenanceType ?? "",
    description: asset.description ?? "",
    type: asset.type ?? "",
    manufacturer: asset.manufacturer ?? "",
    model: asset.model ?? "",
    serialNumber: asset.serialNumber ?? "",
    location: asset.location ?? "",
    installationDate: dateOnly(asset.installationDate),
    purchaseDate: dateOnly(asset.purchaseDate),
    purchaseCost: cost == null || cost === "" ? "" : String(Number(cost)),
    warrantyExpiry: dateOnly(asset.warrantyExpiry),
    status: asset.status ?? "ACTIVE",
  };
}

// ── validation (mirrors the backend zod schemas; the server still decides) ───────────────────────────────────────

export type ValidationKey =
  | "required"
  | "providerNotEligible" // the server refused the chosen warranty provider (no longer eligible)
  | "tooLong"
  | "invalidDate"
  | "invalidNumber"
  | "negative"
  | "tooManyDecimals"
  | "outOfRange"
  | "invalidOption"
  | "branchNotAllowed"
  | "invalidUrl"
  | "endBeforeStart";
export interface FieldError {
  key: ValidationKey;
  /** interpolation value for tooLong */
  max?: number;
}
export type FieldErrors<K extends string = string> = Partial<Record<K, FieldError>>;

/** A real calendar date in YYYY-MM-DD (rejects 2026-02-31). */
export function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const MAX_COST = 9_999_999_999.99; // DECIMAL(12,2)
const TEXT_LIMITS: Partial<Record<AssetFormField, number>> = {
  name: 255,
  description: 2000,
  type: 255,
  manufacturer: 255,
  model: 255,
  serialNumber: 255,
  location: 255,
};
const DATE_FIELDS: AssetFormField[] = ["installationDate", "purchaseDate", "warrantyExpiry"];

export interface AssetValidationOptions {
  mode: "create" | "edit";
  /** Ids of the stations the viewer may use (from the server-scoped GET /branches). Create only. */
  allowedBranchIds?: readonly number[];
}

export function validateAssetForm(values: AssetFormValues, options: AssetValidationOptions): FieldErrors<AssetFormField> {
  const errors: FieldErrors<AssetFormField> = {};
  if (options.mode === "create") {
    const id = Number(values.branchId);
    if (!values.branchId || !Number.isInteger(id) || id <= 0) errors.branchId = { key: "required" };
    else if (options.allowedBranchIds && !options.allowedBranchIds.includes(id)) errors.branchId = { key: "branchNotAllowed" };
  }
  if (!values.name.trim()) errors.name = { key: "required" };
  if (!(MAINTENANCE_TYPES as readonly string[]).includes(values.maintenanceType)) errors.maintenanceType = { key: "required" };
  if (!(ASSET_STATUSES as readonly string[]).includes(values.status)) errors.status = { key: "invalidOption" };
  for (const [field, max] of Object.entries(TEXT_LIMITS) as [AssetFormField, number][]) {
    if (!errors[field] && values[field].trim().length > max) errors[field] = { key: "tooLong", max };
  }
  for (const field of DATE_FIELDS) {
    const v = values[field].trim();
    if (v && !isValidDateOnly(v)) errors[field] = { key: "invalidDate" };
  }
  const cost = values.purchaseCost.trim();
  if (cost) {
    const n = Number(cost);
    if (!Number.isFinite(n)) errors.purchaseCost = { key: "invalidNumber" };
    else if (n < 0) errors.purchaseCost = { key: "negative" };
    else if (n > MAX_COST) errors.purchaseCost = { key: "outOfRange" };
    else if (!/^\d+(\.\d{1,2})?$/.test(cost)) errors.purchaseCost = { key: "tooManyDecimals" };
  }
  return errors;
}

// ── request bodies ───────────────────────────────────────────────────────────────────────────────────────────────

const OPTIONAL_TEXT = ["description", "type", "manufacturer", "model", "serialNumber", "location"] as const;
const OPTIONAL_DATES = ["installationDate", "purchaseDate", "warrantyExpiry"] as const;

/** POST body: empty optional fields are left OUT (createAssetSchema does not accept null). Call after validation. */
export function buildCreateBody(values: AssetFormValues): CreateAssetBody {
  const body: CreateAssetBody = {
    branchId: Number(values.branchId),
    name: values.name.trim(),
    maintenanceType: values.maintenanceType as MaintenanceType,
    status: values.status,
  };
  for (const f of OPTIONAL_TEXT) {
    const v = values[f].trim();
    if (v) body[f] = v;
  }
  for (const f of OPTIONAL_DATES) {
    const v = values[f].trim();
    if (v) body[f] = v;
  }
  if (values.purchaseCost.trim()) body.purchaseCost = Number(values.purchaseCost.trim());
  return body;
}

/**
 * PATCH body: ONLY what changed. A cleared optional field is sent as null (updateAssetSchema allows it); the station
 * is never sent (the backend does not let an asset move). An empty object means "nothing to save".
 */
export function buildUpdateBody(original: Asset, values: AssetFormValues): UpdateAssetBody {
  const before = assetToForm(original);
  const body: UpdateAssetBody = {};
  if (values.name.trim() !== before.name.trim()) body.name = values.name.trim();
  if (values.maintenanceType !== before.maintenanceType) body.maintenanceType = values.maintenanceType as MaintenanceType;
  if (values.status !== before.status) body.status = values.status;
  for (const f of OPTIONAL_TEXT) {
    const next = values[f].trim();
    if (next !== before[f].trim()) body[f] = next === "" ? null : next;
  }
  for (const f of OPTIONAL_DATES) {
    const next = values[f].trim();
    if (next !== before[f]) body[f] = next === "" ? null : next;
  }
  const nextCost = values.purchaseCost.trim();
  if (nextCost !== before.purchaseCost.trim()) body.purchaseCost = nextCost === "" ? null : Number(nextCost);
  return body;
}

export const hasChanges = (body: object) => Object.keys(body).length > 0;

// ── list helpers ─────────────────────────────────────────────────────────────────────────────────────────────────

export const ASSETS_PAGE_SIZE = 10;

export interface Page<T> {
  items: T[];
  page: number;
  totalPages: number;
  total: number;
  startIndex: number;
}

/** Client-side pagination (the list endpoint returns everything the caller may see). The page is clamped to a valid one. */
export function paginate<T>(items: readonly T[], page: number, pageSize = ASSETS_PAGE_SIZE): Page<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (current - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page: current, totalPages, total, startIndex: total === 0 ? 0 : start + 1 };
}

/** Server-side filters we pass to GET /assets (search + station). Empty values are dropped. */
export function toListParams(branchId: string, search: string): AssetListParams {
  const params: AssetListParams = {};
  const id = Number(branchId);
  if (branchId && Number.isInteger(id) && id > 0) params.branchId = id;
  if (search.trim()) params.search = search.trim();
  return params;
}

export const hasActiveFilters = (params: AssetListParams) => params.branchId != null || !!params.search;

// ── query keys: always carry the viewer's company, so nothing is shared across companies ─────────────────────────

export const assetKeys = {
  root: (orgId: number | null | undefined) => ["assets", "manage", orgId ?? null] as const,
  list: (orgId: number | null | undefined, params: AssetListParams) => ["assets", "manage", orgId ?? null, "list", params] as const,
  detail: (orgId: number | null | undefined, id: number | string) => ["assets", "manage", orgId ?? null, "detail", String(id)] as const,
  /** Sub-resources of one asset; `warrantyProviders` = the eligible providers for that asset's warranty picker. */
  sub: (orgId: number | null | undefined, id: number | string, kind: "documents" | "warranties" | "warrantyProviders" | "inspections" | "maintenance" | "history") =>
    ["assets", "manage", orgId ?? null, "detail", String(id), kind] as const,
};

// ── dates ────────────────────────────────────────────────────────────────────────────────────────────────────────

/** DATEONLY values are calendar dates, not instants: format them in UTC so no timezone can shift the day. */
export function formatDateOnly(value: string | null | undefined, locale: string): string {
  if (!value) return "—";
  const d = new Date(`${dateOnly(value)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(`${locale}-u-nu-latn`, { dateStyle: "medium", timeZone: "UTC" }).format(d);
}

export function formatDateTime(value: string | null | undefined, locale: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(`${locale}-u-nu-latn`, { dateStyle: "medium", timeStyle: "short" }).format(d);
}

/** Today as YYYY-MM-DD in the viewer's local calendar. */
export function todayDateOnly(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export type WarrantyStatus = "upcoming" | "active" | "expired";
export function warrantyStatus(record: Pick<WarrantyRecord, "startDate" | "endDate">, today = todayDateOnly()): WarrantyStatus {
  const start = dateOnly(record.startDate);
  const end = dateOnly(record.endDate);
  if (end < today) return "expired";
  if (start > today) return "upcoming";
  return "active";
}

/** <input type="datetime-local"> value (local time) → the ISO instant the API wants; null when invalid. */
export function localInputToIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
export function nowLocalInput(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}T${p(now.getHours())}:${p(now.getMinutes())}`;
}

// ── sub-record forms ─────────────────────────────────────────────────────────────────────────────────────────────

/** Documents are registered by LINK. Backend accepts http(s):// or a local /uploads/… path and refuses anything else. */
export const isAllowedDocumentUrl = (url: string) => /^https?:\/\/\S+$/i.test(url) || /^\/uploads\/\S+$/.test(url);
/** Only http(s) links are rendered as clickable links. */
export const isSafeLinkHref = (url: string) => /^https?:\/\//i.test(url);

export interface DocumentFormValues { fileUrl: string; title: string; fileType: string }
export function validateDocumentForm(v: DocumentFormValues): FieldErrors<keyof DocumentFormValues> {
  const e: FieldErrors<keyof DocumentFormValues> = {};
  const url = v.fileUrl.trim();
  if (!url) e.fileUrl = { key: "required" };
  else if (url.length > 2048) e.fileUrl = { key: "tooLong", max: 2048 };
  else if (!isAllowedDocumentUrl(url)) e.fileUrl = { key: "invalidUrl" };
  if (v.title.trim().length > 255) e.title = { key: "tooLong", max: 255 };
  if (v.fileType.trim().length > 128) e.fileType = { key: "tooLong", max: 128 };
  return e;
}
export function buildDocumentBody(v: DocumentFormValues): CreateAssetDocumentBody {
  const body: CreateAssetDocumentBody = { fileUrl: v.fileUrl.trim() };
  if (v.title.trim()) body.title = v.title.trim();
  if (v.fileType.trim()) body.fileType = v.fileType.trim();
  return body;
}

export interface WarrantyFormValues { providerOrganizationId: string; startDate: string; endDate: string }
/** The API accepts warranty dates from 1900 to 2999 only (MariaDB also stores 0000-00-00, which must never get through). */
export const isWarrantyDate = (value: string): boolean => isValidDateOnly(value) && Number(value.slice(0, 4)) >= 1900 && Number(value.slice(0, 4)) <= 2999;

export function validateWarrantyForm(v: WarrantyFormValues, { providerRequired = true } = {}): FieldErrors<keyof WarrantyFormValues> {
  const e: FieldErrors<keyof WarrantyFormValues> = {};
  if (providerRequired && !(Number.isInteger(Number(v.providerOrganizationId)) && Number(v.providerOrganizationId) > 0)) e.providerOrganizationId = { key: "required" };
  if (!v.startDate) e.startDate = { key: "required" };
  else if (!isWarrantyDate(v.startDate)) e.startDate = { key: "invalidDate" };
  if (!v.endDate) e.endDate = { key: "required" };
  else if (!isWarrantyDate(v.endDate)) e.endDate = { key: "invalidDate" };
  if (!e.startDate && !e.endDate && v.endDate < v.startDate) e.endDate = { key: "endBeforeStart" };
  return e;
}
/** A provider's display name in the viewer's language: Arabic prefers nameAr, English prefers name, each falling back to the other. */
export function warrantyProviderName(p: { name: string | null; nameAr: string | null } | null | undefined, language: string): string | null {
  if (!p) return null;
  const clean = (v: string | null) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return language.startsWith("ar") ? clean(p.nameAr) ?? clean(p.name) : clean(p.name) ?? clean(p.nameAr);
}

export interface WarrantyEditValues { providerOrganizationId: string; startDate: string; endDate: string }
/** What the edit dialog starts from. */
export const warrantyToEditValues = (w: Pick<WarrantyRecord, "providerOrganizationId" | "startDate" | "endDate">): WarrantyEditValues => ({
  providerOrganizationId: String(w.providerOrganizationId), startDate: dateOnly(w.startDate), endDate: dateOnly(w.endDate),
});
/** Only the fields that really changed, or `null` when nothing did (then no request is sent). */
export function buildWarrantyUpdate(original: Pick<WarrantyRecord, "providerOrganizationId" | "startDate" | "endDate">, v: WarrantyEditValues): UpdateWarrantyBody | null {
  const body: UpdateWarrantyBody = {};
  const provider = Number(v.providerOrganizationId);
  if (Number.isInteger(provider) && provider > 0 && provider !== original.providerOrganizationId) body.providerOrganizationId = provider;
  if (v.startDate && v.startDate !== dateOnly(original.startDate)) body.startDate = v.startDate;
  if (v.endDate && v.endDate !== dateOnly(original.endDate)) body.endDate = v.endDate;
  return Object.keys(body).length ? body : null;
}

export interface WarrantyProviderChoice {
  id: number;
  name: string | null;
  nameAr: string | null;
  /** Set only for the warranty's CURRENT provider when it is no longer eligible (shown, never offered as a new choice). */
  historicalState?: Exclude<WarrantyProviderState, "ELIGIBLE">;
  isCurrent: boolean;
}
/**
 * The choices of the edit dialog: every eligible provider, plus the warranty's current provider when it is not among them
 * (inactive, unlinked or unavailable) so the current value is always displayable. An ineligible provider is never offered
 * as a NEW selection: the current one is selectable only because choosing it means "unchanged".
 */
export function warrantyProviderChoices(current: Pick<WarrantyRecord, "providerOrganizationId" | "provider">, eligible: readonly WarrantyProviderOption[]): WarrantyProviderChoice[] {
  const out: WarrantyProviderChoice[] = eligible.map((p) => ({ id: p.id, name: p.name, nameAr: p.nameAr, isCurrent: p.id === current.providerOrganizationId }));
  if (!out.some((c) => c.id === current.providerOrganizationId)) {
    const d = current.provider;
    const state = d && d.state !== "ELIGIBLE" ? d.state : "UNAVAILABLE";
    out.unshift({ id: current.providerOrganizationId, name: d?.name ?? null, nameAr: d?.nameAr ?? null, historicalState: state, isCurrent: true });
  }
  return out;
}

export const buildWarrantyBody = (v: WarrantyFormValues): CreateWarrantyBody => ({
  providerOrganizationId: Number(v.providerOrganizationId),
  startDate: v.startDate,
  endDate: v.endDate,
});

export interface InspectionFormValues { inspectionDate: string; status: string; notes: string }
export function validateInspectionForm(v: InspectionFormValues): FieldErrors<keyof InspectionFormValues> {
  const e: FieldErrors<keyof InspectionFormValues> = {};
  if (!v.inspectionDate) e.inspectionDate = { key: "required" };
  else if (!isValidDateOnly(v.inspectionDate)) e.inspectionDate = { key: "invalidDate" };
  if (v.status.trim().length > 50) e.status = { key: "tooLong", max: 50 };
  if (v.notes.trim().length > 2000) e.notes = { key: "tooLong", max: 2000 };
  return e;
}
export function buildInspectionBody(v: InspectionFormValues): CreateInspectionBody {
  const body: CreateInspectionBody = { inspectionDate: v.inspectionDate };
  if (v.status.trim()) body.status = v.status.trim();
  if (v.notes.trim()) body.notes = v.notes.trim();
  return body;
}

export interface MaintenanceFormValues { performedAt: string; notes: string }
export function validateMaintenanceForm(v: MaintenanceFormValues): FieldErrors<keyof MaintenanceFormValues> {
  const e: FieldErrors<keyof MaintenanceFormValues> = {};
  if (!v.performedAt) e.performedAt = { key: "required" };
  else if (!localInputToIso(v.performedAt)) e.performedAt = { key: "invalidDate" };
  if (v.notes.trim().length > 2000) e.notes = { key: "tooLong", max: 2000 };
  return e;
}
export function buildMaintenanceBody(v: MaintenanceFormValues): CreateInternalMaintenanceBody {
  const body: CreateInternalMaintenanceBody = { performedAt: localInputToIso(v.performedAt) as string };
  if (v.notes.trim()) body.notes = v.notes.trim();
  return body;
}

// ── errors ───────────────────────────────────────────────────────────────────────────────────────────────────────

export type AssetErrorKind =
  | "warrantyDuplicate" // 409 WARRANTY_DUPLICATE (exactly the same provider and dates already recorded)
  | "warrantyProvider" // 400 WARRANTY_PROVIDER_NOT_ELIGIBLE
  | "warrantyDate" // 400 WARRANTY_DATE_INVALID
  | "warrantyRange" // 400 WARRANTY_DATE_RANGE_INVALID
  | "conflict" // 409 — on asset create/update this is a duplicate serial number
  | "validation" // 400 from the server's own validation
  | "unsafeUrl" // 400 UNSAFE_MEDIA_URL
  | "branchDenied" // 403 BRANCH_ACCESS_DENIED (outside the caller's stations)
  | "forbidden" // 401 / other 403
  | "unavailable" // 503 (permissions or schema cannot be verified right now)
  | "notFound" // 404 (also what another company's asset looks like)
  | "network"
  | "server";

export interface AssetError {
  kind: AssetErrorKind;
  status: number | null;
  /** Server field errors from a 400 (`errors: [{field, message}]`), keyed by the bare field name. */
  fieldErrors: Record<string, string>;
}

interface HttpErrorShape {
  response?: { status?: number; data?: { code?: string; message?: string; errors?: unknown } };
}

/** Classify by stable status / code — never by the English message text. */
export function classifyAssetError(error: unknown): AssetError {
  const res = (error as HttpErrorShape | null)?.response;
  if (!res) return { kind: "network", status: null, fieldErrors: {} };
  const status = res.status ?? null;
  const code = res.data?.code;
  const fieldErrors: Record<string, string> = {};
  const raw = res.data?.errors;
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const f = (item as { field?: unknown; message?: unknown }).field;
      const m = (item as { field?: unknown; message?: unknown }).message;
      if (typeof f === "string" && typeof m === "string") fieldErrors[f.replace(/^body\./, "")] = m;
    }
  }
  let kind: AssetErrorKind = "server";
  if (code === "WARRANTY_DUPLICATE") kind = "warrantyDuplicate";
  else if (code === "WARRANTY_PROVIDER_NOT_ELIGIBLE") kind = "warrantyProvider";
  else if (code === "WARRANTY_DATE_INVALID") kind = "warrantyDate";
  else if (code === "WARRANTY_DATE_RANGE_INVALID") kind = "warrantyRange";
  else if (status === 409) kind = "conflict";
  else if (code === "UNSAFE_MEDIA_URL") kind = "unsafeUrl";
  else if (status === 400) kind = "validation";
  else if (code === "BRANCH_ACCESS_DENIED") kind = "branchDenied";
  else if (status === 401 || status === 403) kind = "forbidden";
  else if (status === 503) kind = "unavailable";
  else if (status === 404) kind = "notFound";
  return { kind, status, fieldErrors };
}

/** Errors that mean "this page is not for you / does not exist": show a state, never a retry button. */
export const isTerminalAssetError = (kind: AssetErrorKind) => kind === "forbidden" || kind === "branchDenied" || kind === "notFound";
