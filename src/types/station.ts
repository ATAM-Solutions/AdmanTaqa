/** Station (Fuel Station) — maintenance requests, external requests, linked providers */

/**
 * Allowed statuses for "Send to providers" / اختيار المزود من صفحة الطلب (e.g. station-requests/22).
 * QUOTING_OPEN مضافة لتمكين اختيار/إرسال لمزودين إضافيين من نفس الصفحة.
 */
export const STATION_REQUEST_STATUSES_ALLOWED_SEND_TO_PROVIDERS = [
  "SUBMITTED_BY_STATION",
  "TRIAGED_BY_OPERATOR",
  "QUOTING_OPEN",
] as const;

export type StationRequestStatusSendToProviders =
  (typeof STATION_REQUEST_STATUSES_ALLOWED_SEND_TO_PROVIDERS)[number];

/** Status filter options for GET /api/station/requests?status=... */
export const STATION_REQUEST_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "SUBMITTED_BY_STATION", label: "Submitted by station" },
  { value: "TRIAGED_BY_OPERATOR", label: "Triaged" },
  { value: "QUOTING_OPEN", label: "Quoting open" },
  { value: "AWAITING_PAYMENT", label: "Awaiting payment" },
  { value: "ACTIVE", label: "Active" },
  { value: "UNDER_REVIEW", label: "Under review" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CLOSED", label: "Closed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export type MaintenanceMode = "INTERNAL" | "EXTERNAL";
export type MaintenancePriority = "LOW" | "MEDIUM" | "HIGH";

export interface FirstTaskInput {
  assignedUserId?: number | null;
  notes?: string | null;
}

export interface MaintenanceRequestBody {
  branchId: number;
  assetId?: number | null;
  title: string;
  description?: string | null;
  priority?: MaintenancePriority;
  maintenanceMode: MaintenanceMode;
  attachments?: unknown[];
  firstTask?: FirstTaskInput | null;
  providerOrganizationIds?: number[];
  providerAudience?: "ALL_ELIGIBLE" | "LINKED_ELIGIBLE" | "SELECTED_LINKED";
}

export interface InternalWorkOrderRef {
  id: number;
  title?: string;
  status?: string;
}

export interface InternalTaskRef {
  id: number;
  title?: string;
}

export interface ExternalRequestRef {
  id: number;
  status?: string;
}

export interface CreateMaintenanceRequestResponse {
  success?: boolean;
  data?: {
    internalWorkOrder?: InternalWorkOrderRef;
    firstTask?: InternalTaskRef;
    externalRequest?: ExternalRequestRef;
  };
  message?: string;
}

export interface StationRequestItem {
  id: number;
  status?: string;
  title?: string;
  description?: string | null;
  branchId?: number | null;
  maintenanceRequestId?: number;
  createdAt?: string;
  updatedAt?: string;
  quotes?: ProviderQuoteSummary[];
  selectedQuoteId?: number | null;
  cancellationReason?: string | null;
  formData?: { description?: string; priority?: string; [key: string]: unknown };
  Branch?: StationRequestBranch;
}

export interface StationRequestBranch {
  id: number;
  nameEn?: string;
  nameAr?: string;
  address?: string | null;
  street?: string | null;
  managerName?: string | null;
  managerPhone?: string | null;
  managerEmail?: string | null;
  licenseNumber?: string | null;
  status?: string;
  isActive?: boolean;
}

export interface ProviderQuoteSummary {
  id: number;
  providerOrganizationId?: number;
  /** Provider company name (only the providers this station sent the request to). */
  providerName?: string | null;
  amount?: number;
  currency?: string | null;
  status?: string;
  validUntil?: string;
  rejectionReason?: string | null;
  /** Offer details the provider entered (labour, materials, timeline, warranty, scope, notes...). */
  pricing?: Record<string, unknown> | null;
  paymentTerms?: { sequence: number; percent: number; trigger: string; note?: string | null }[];
  attachments?: { id: number; fileUrl: string; fileName?: string | null; mimeType?: string | null }[];
}

export interface StationRequestDetail extends StationRequestItem {
  /** Files of the report this request was created from (read-only); null when it has no source report. */
  sourceReport?: import("@/types/sourceReport").SourceReport | null;
  /** Providers this request was already sent to (external requests). */
  recipients?: { organizationId: number; name: string | null; sentAt?: string | null }[];
  jobOrders?: ExternalJobOrderSummary[];
  /** For external requests, backend may return a single ExternalJobOrder when a quote is selected */
  ExternalJobOrder?: ExternalJobOrderSummary;
  paymentStatus?: string;
}

export interface ExternalJobOrderSummary {
  id: number;
  status?: string;
  paymentRecord?: { status?: string; rejectionReason?: string | null; receiptFileUrl?: string | null };
}

/** ExternalRequest nested in station job order list item */
export interface StationJobOrderExternalRequest {
  id: number;
  formData?: { title?: string; priority?: string; description?: string; attachments?: unknown[] };
  fuelStationOrganizationId?: number;
  branchId?: number | null;
  status?: string;
  Branch?: { id: number; nameEn?: string; nameAr?: string };
}

/** ProviderQuote nested in station job order list item */
export interface StationJobOrderProviderQuote {
  id: number;
  serviceProviderOrganizationId?: number;
  Organization?: { id: number; name?: string };
}

/** Station job order list item (GET /api/station/job-orders) */
export interface StationJobOrderListItem {
  id: number;
  providerQuoteId?: number;
  externalRequestId?: number;
  assignedBranchId?: number | null;
  status?: string;
  activatedAt?: string | null;
  executionDetails?: string | null;
  cancellationReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
  ExternalRequest?: StationJobOrderExternalRequest | null;
  ProviderQuote?: StationJobOrderProviderQuote | null;
  MaintenanceReports?: unknown[];
  paymentRecord?: { status?: string; rejectionReason?: string | null; receiptFileUrl?: string | null };
  /** Legacy */
  serviceRequestId?: number;
  ServiceRequest?: { id: number; formData?: { description?: string; title?: string }; status?: string };
}

export interface StationJobOrderListResponse {
  success?: boolean;
  data?: StationJobOrderListItem[] | { items?: StationJobOrderListItem[]; total?: number; page?: number; limit?: number };
  message?: string;
}

/** Maintenance report (GET station/job-orders/:id/reports) */
export interface StationJobOrderReportItem {
  id: number;
  status?: string;
  title?: string;
  createdAt?: string;
}

export interface StationRequestsListResponse {
  success?: boolean;
  data?: StationRequestItem[] | { items?: StationRequestItem[]; total?: number; page?: number; limit?: number };
  message?: string;
}

export interface LinkedProviderItem {
  id: number;
  organizationId: number;
  organizationName?: string;
  status?: string;
}

export interface ConfirmSentBody {
  referenceNumber?: string;
  receiptFileUrl?: string;
  amount?: number;
  method?: string;
}

/** Linked provider for "Send to providers" (GET /api/requests/linked-providers) */
export interface LinkedProviderForRequest {
  id: number;
  name: string;
}

/** Body for POST /api/requests (maintenance-request-frontend-guide) */
export interface CreateRequestPayload {
  branchId: number;
  formData?: {
    description?: string;
    priority?: string;
    [key: string]: unknown;
  };
  areaId?: number;
  cityId?: number;
  providerOrganizationIds?: number[];
}

/** Response from POST /api/requests */
export interface CreateRequestResponse {
  success?: boolean;
  data?: {
    id?: number;
    internalWorkOrderId?: number;
    [key: string]: unknown;
  };
  message?: string;
}
