/** Provider (Service Provider) — RFQs, quotes, job orders, confirm received */

/** Operator — from GET /api/operators (service provider organization) */
export interface ProviderOperator {
  id: number;
  organizationId?: number;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Operator nested in ExternalJobAssignment (GET provider/job-orders/:id) */
export interface ProviderJobOrderOperator {
  id: number;
  organizationId?: number;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Assignment from GET provider/job-orders/:id — data.ExternalJobAssignments[] */
export interface ProviderJobOrderAssignment {
  id: number;
  externalJobOrderId?: number;
  operatorId?: number;
  arrivalTime?: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  /** API returns PascalCase */
  Operator?: ProviderJobOrderOperator;
  operator?: ProviderJobOrderOperator;
}

/** Visit from GET provider/job-orders/:id — data.ExternalJobVisits[] */
/** User ref nested in ExternalJobVisits (CreatedByUser, OperatorUser) */
export interface ProviderJobOrderVisitUser {
  id?: number;
  fullName?: string | null;
  email?: string | null;
}

export interface ProviderJobOrderVisit {
  id: number;
  externalJobOrderId?: number;
  type?: string;
  visitDate?: string | null;
  status?: string | null;
  scheduledAt?: string | null;
  operatorUserId?: number | null;
  notes?: string | null;
  checkedInAt?: string | null;
  completedAt?: string | null;
  completionNote?: string | null;
  createdAt?: string;
  updatedAt?: string;
  OperatorUser?: ProviderJobOrderVisitUser | null;
  CreatedByUser?: ProviderJobOrderVisitUser | null;
}

/** Maintenance report from GET provider/job-orders/:id — data.MaintenanceReports[] */
export interface ProviderJobOrderMaintenanceReport {
  id: number;
  jobOrderId?: number;
  externalJobOrderId?: number;
  title?: string | null;
  content?: string | null;
  status?: string | null;
  submittedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

/** formData from GET /requests (RFQ) — doc: title, description, requiredTimeline */
export interface ProviderRfqFormData {
  title?: string;
  priority?: string;
  description?: string;
  requiredTimeline?: string;
  attachments?: unknown[];
}

export interface ProviderRfqBranch {
  id: number;
  nameEn?: string;
  nameAr?: string;
  street?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
}

export interface ProviderRfqOrganization {
  id: number;
  name?: string;
}

export interface ProviderRfqArea {
  id: number;
  name?: string;
}

export interface ProviderRfqItem {
  id: number;
  externalRequestId?: number;
  title?: string;
  description?: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  quotes?: ProviderQuoteItem[];
  /** API list response fields */
  fuelStationOrganizationId?: number;
  branchId?: number | null;
  requestedByUserId?: number | null;
  areaId?: number | null;
  cityId?: number | null;
  assetId?: number | null;
  formData?: ProviderRfqFormData;
  Branch?: ProviderRfqBranch | null;
  Asset?: unknown;
  Organization?: ProviderRfqOrganization | null;
  Area?: ProviderRfqArea | null;
  City?: { id: number; name?: string } | null;
}

/** Backend returns this inside ProviderQuotes[].ExternalJobOrder (selected quote) */
export interface ProviderRfqExternalJobOrder {
  id: number;
  status?: string;
  /** API returns PaymentRecord (capital P) */
  PaymentRecord?: { status?: string; rejectionReason?: string | null; receiptFileUrl?: string | null };
}

/** Detail API may return ProviderQuotes (capital P) */
export interface ProviderRfqDetail extends ProviderRfqItem {
  stationOrganizationId?: number;
  ProviderQuotes?: ProviderQuoteItem[];
}

/** Attachment on a payment term (from quotePaymentTerms[].attachments). */
export interface QuotePaymentTermAttachment {
  id?: number;
  fileName?: string;
  fileUrl?: string;
}

/** Single payment term from API (QuotePaymentTerms[] on a quote). Percent + trigger define when this installment is due. */
export interface QuotePaymentTerm {
  id?: number;
  providerQuoteId?: number;
  sequence?: number;
  percent?: string;
  trigger?: string;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
  /** Attachments for this installment (from quotes[].quotePaymentTerms[].attachments). */
  attachments?: QuotePaymentTermAttachment[];
}

export interface ProviderQuoteItem {
  id: number;
  rfqId?: number;
  externalRequestId?: number;
  providerOrganizationId?: number;
  serviceProviderOrganizationId?: number;
  amount?: number;
  validUntil?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  /** When this quote is SELECTED, backend returns the linked External Job Order */
  ExternalJobOrder?: ProviderRfqExternalJobOrder;
  /** Payment installments: e.g. 50% ON_APPROVAL, 50% ON_JOB_CLOSED. API may return QuotePaymentTerms (PascalCase). */
  QuotePaymentTerms?: QuotePaymentTerm[];
  quotePaymentTerms?: QuotePaymentTerm[];
  /** From latest ProviderQuoteRevision.pricingJson (doc: provider-rfqs-filters-and-pricing). */
  pricingDetails?: { amount?: number; currency?: string; lineItems?: unknown[]; [key: string]: unknown };
}

/** Resolve payment terms from a quote (API may use PascalCase or camelCase). */
export function getQuotePaymentTerms(q: ProviderQuoteItem): QuotePaymentTerm[] {
  const terms = q.QuotePaymentTerms ?? q.quotePaymentTerms ?? [];
  return Array.isArray(terms) ? terms : [];
}

/** One payment term when creating/editing a quote (POST provider/rfqs/:id/quotes). */
export interface CreateQuotePaymentTerm {
  sequence: number;
  percent: number;
  trigger: string;
  note?: string;
}

/** Backend expects pricingJson (free-form), optional paymentTerms, and submit. */
export interface CreateQuoteBody {
  pricingJson?: Record<string, unknown>;
  /** Payment in installments: array of { sequence, percent, trigger, note? }. Sum of percent must be 100. */
  paymentTerms?: CreateQuotePaymentTerm[];
  submit?: boolean;
  /** @deprecated Prefer pricingJson.amount */
  amount?: number;
  validUntil?: string;
  [key: string]: unknown;
}

/** ExternalRequest nested in provider job order list (from API) */
export interface ProviderJobOrderExternalRequest {
  id?: number;
  status?: string;
  branchId?: number | null;
  formData?: {
    title?: string;
    priority?: string;
    description?: string;
    attachments?: unknown[];
    [key: string]: unknown;
  };
}

export interface ProviderJobOrderItem {
  id: number;
  providerQuoteId?: number;
  externalRequestId?: number;
  assignedBranchId?: number | null;
  status?: string;
  activatedAt?: string | null;
  expectedStartDate?: string | null;
  expectedEndDate?: string | null;
  cancellationReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
  paymentRecord?: PaymentRecordSummary;
  /** Nested from API (ExternalRequest) — request details + formData */
  externalRequest?: ProviderJobOrderExternalRequest | null;
  providerQuote?: { id?: number; status?: string; [key: string]: unknown } | null;
  /** Nested from API (ExecutionDetails) — attachments uploaded for this job order */
  executionDetails?: {
    attachments?: Array<{
      fileUrl?: string;
      uploadedAt?: string;
      description?: string | null;
      uploadedByUserId?: number;
    }>;
  } | null;
  /** Nested from API (ExternalJobAssignments) — operators assigned to this job order */
  externalJobAssignments?: ProviderJobOrderAssignment[];
  /** Nested from API (ExternalJobVisits) — visits for this job order */
  externalJobVisits?: ProviderJobOrderVisit[];
  /** Nested from API (MaintenanceReports) — maintenance reports for this job order */
  maintenanceReports?: ProviderJobOrderMaintenanceReport[];
}

export interface PaymentRecordSummary {
  id?: number;
  status?: string;
  rejectionReason?: string | null;
  /** URL of uploaded bank transfer receipt (when API returns it). */
  receiptFileUrl?: string | null;
  method?: string | null;
  amount?: number | string | null;
  referenceNumber?: string | null;
  stationConfirmedAt?: string | null;
  providerConfirmedAt?: string | null;
  rejectedAt?: string | null;
}

export interface ProviderJobOrderDetail extends ProviderJobOrderItem {
  title?: string;
  description?: string | null;
  selectedQuoteId?: number;
  /** When status is CANCELLED */
  cancellationReason?: string | null;
}

export interface ConfirmReceivedBody {
  confirm: boolean;
  note?: string;
  rejectionReason?: string;
}

export interface ProviderRfqsListResponse {
  success?: boolean;
  data?: ProviderRfqItem[] | { items?: ProviderRfqItem[]; total?: number; page?: number; limit?: number };
  message?: string;
}

export interface ProviderJobOrdersListResponse {
  success?: boolean;
  data?:
    | ProviderJobOrderItem[]
    | { items?: ProviderJobOrderItem[]; total?: number; page?: number; limit?: number };
  message?: string;
}

export interface ProviderVisitItem {
  id: number;
  visitDate?: string;
  status?: string;
  notes?: string | null;
  createdAt?: string;
  /** Visit type when supported by API */
  type?: "EXECUTION" | "INSPECTION" | "FOLLOW_UP";
}

/** Body for POST .../job-orders/:id/visits — create visit (visit-first flow). */
export type ProviderVisitType = "EXECUTION" | "INSPECTION" | "FOLLOW_UP";

export interface CreateProviderVisitBody {
  type: ProviderVisitType;
  scheduledAt?: string; // YYYY-MM-DD
  operatorUserId?: number;
  notes?: string;
}

/** Body for POST .../visits/checkin — arrivalVerificationType required by backend */
export type ProviderVisitCheckinVerificationType = "GPS" | "QR" | "MANUAL";

export interface CreateProviderVisitCheckinBody {
  arrivalVerificationType: ProviderVisitCheckinVerificationType;
  notes?: string;
  visitDate?: string; // YYYY-MM-DD
  metadataJson?: object;
}

export interface ProviderAttachmentItem {
  id: number;
  name?: string;
  url?: string;
  fileUrl?: string;
  description?: string | null;
  createdAt?: string;
}

/** Maintenance report (provider job order) — list item from GET job-orders/:id/reports */
export interface ProviderReportItem {
  id: number;
  jobOrderId?: number;
  externalJobOrderId?: number;
  visitId?: number;
  submittedByUserId?: number;
  status?: string;
  title?: string;
  content?: string | null;
  findings?: string | null;
  actionsTaken?: string | null;
  recommendations?: string | null;
  checklistJson?: Array<{ item?: string; checked?: boolean; note?: string | null }> | null;
  attachments?: Array<{ fileUrl?: string; publicId?: string; category?: string; uploadedAt?: string }> | null;
  submittedAt?: string | null;
  reviewedByUserId?: number | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  rejectionReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
  Visit?: { id?: number; type?: string; status?: string; visitDate?: string } | null;
  SubmittedBy?: { id?: number; fullName?: string } | null;
  ReviewedBy?: { id?: number | null; fullName?: string | null } | null;
}

export interface CreateProviderReportBody {
  title: string;
  content?: string | null;
  [key: string]: unknown;
}
