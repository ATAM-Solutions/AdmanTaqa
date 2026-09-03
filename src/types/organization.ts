import type { ServiceCategory } from "@/types/serviceCategory";

export interface OrganizationProfile {
    id: number;
    name: string;
    nameEn: string;
    nameAr: string | null;
    type: "FUEL_STATION" | "SERVICE_PROVIDER" | "AUTHORITY" | "SUPER_ADMIN";
    status: "PENDING" | "APPROVED" | "REJECTED";
    rejectionReason: string | null;
    approvedAt: string | null;
    approvedByUserId: number | null;
    createdAt: string;
    updatedAt: string;
    /** Company profile / branding fields (nullable, added by the company-management release). */
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    cityId?: number | null;
    logoUrl?: string | null;
    isActive?: boolean;
    City?: { id: number; name: string } | null;
    FuelStationProfile?: { id: number; organizationId: number; registrationNumber: string | null } | null;
}

export interface OrganizationResponse {
    success: boolean;
    data: OrganizationProfile;
    message?: string;
}

/** Approver/user summary in GET /organizations/me/full (User, User in OrganizationApprovals) */
export interface OrganizationMeFullUser {
    id: number;
    fullName: string;
    email: string;
}

/** Branch in GET /organizations/me/full (Branches array) */
export interface OrganizationMeFullBranch {
    id: number;
    organizationId: number;
    areaId: number;
    nameEn: string | null;
    nameAr: string | null;
    licenseNumber: string | null;
    stationTypeId: number | null;
    street: string | null;
    latitude: number | null;
    longitude: number | null;
    workingHours: string | null;
    address: string | null;
    ownerName: string | null;
    ownerEmail: string | null;
    managerName: string | null;
    managerEmail: string | null;
    managerPhone: string | null;
    managerUserId: number | null;
    status: string;
    qrToken: string | null;
    geofenceRadiusMeters: number | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    Area?: { id: number; name: string } | null;
}

/** Approval record in GET /organizations/me/full (OrganizationApprovals array) */
export interface OrganizationMeFullApproval {
    id: number;
    organizationId: number;
    reviewedByUserId: number;
    decision: string;
    reason: string | null;
    createdAt: string;
    User?: OrganizationMeFullUser | null;
}

/** Role in GET /organizations/me/full (Roles array) */
export interface OrganizationMeFullRole {
    id: number;
    organizationId: number;
    organizationType: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    createdAt: string;
    updatedAt: string;
}

/** Linked service provider item (LinkedAsServiceProvider array) */
export interface LinkedAsServiceProviderItem {
    id: number;
    fuelStationOrganizationId: number;
    serviceProviderOrganizationId: number;
    status: string;
    startedAt: string;
    createdAt: string;
    updatedAt: string;
    FuelStationOrganization?: { id: number; name: string } | null;
}

/** Employee invitation in GET /organizations/me/full (EmployeeInvitations array) */
export interface OrganizationMeFullEmployeeInvitation {
    id: number;
    organizationId: number;
    branchId: number | null;
    roleId: number | null;
    jobGradeId: number | null;
    supervisorUserId: number | null;
    email: string;
    phone: string | null;
    token: string;
    status: string;
    expiresAt: string;
    createdByUserId: number | null;
    acceptedByUserId: number | null;
    createdAt: string;
    updatedAt: string;
}

/** ServiceProviderProfile as returned in GET /organizations/me/full (includes amount, Area, City, ServiceProviderDocuments) */
export interface OrganizationMeFullServiceProviderProfile extends ServiceProviderProfile {
    amount?: string | null;
    ServiceProviderDocuments?: ServiceProviderDocumentItem[];
}

/** Owner summary in GET /organizations/me/full (owner) */
export interface OrganizationMeFullOwner {
    fullName: string;
    email: string;
    phone?: string | null;
}

/** GET /organizations/me/full — organization + nested User, Users, Branches, Approvals, Roles, etc. */
export interface OrganizationMeFullData extends OrganizationProfile {
    User?: OrganizationMeFullUser | null;
    Users?: OrganizationByIdUser[];
    Branches?: OrganizationMeFullBranch[];
    OrganizationDocuments?: OrganizationByIdDocument[];
    OrganizationApprovals?: OrganizationMeFullApproval[];
    Roles?: OrganizationMeFullRole[];
    ServiceProviderProfile?: OrganizationMeFullServiceProviderProfile | null;
    LinkedAsFuelStation?: unknown[];
    LinkedAsServiceProvider?: LinkedAsServiceProviderItem[];
    EmployeeInvitations?: OrganizationMeFullEmployeeInvitation[];
    BranchRequests?: unknown[];
    owner?: OrganizationMeFullOwner | null;
}

export interface OrganizationMeFullResponse {
    success: boolean;
    data: OrganizationMeFullData;
    message?: string;
}

/** User in GET /organizations/:id response (Users array) */
export interface OrganizationByIdUser {
    id: number;
    organizationId: number;
    email: string;
    fullName: string;
    phone?: string | null;
    isActive: boolean;
    supervisorUserId?: number | null;
    preferences?: unknown;
    createdAt: string;
    updatedAt: string;
}

/** Document in GET /organizations/:id response (OrganizationDocuments array) */
export interface OrganizationByIdDocument {
    id: number;
    organizationId: number;
    documentType: string;
    fileUrl?: string | null;
    fileName?: string | null;
    uploadedByUserId?: number | null;
    issuedAt?: string | null;
    expiresAt?: string | null;
    approvedAt?: string | null;
    approvedByUserId?: number | null;
    status?: string;
    rejectionReason?: string | null;
    createdAt: string;
    updatedAt: string;
}

/** Service provider doc in GET /organizations/:id → ServiceProviderProfile.ServiceProviderDocuments */
export interface ServiceProviderDocumentItem {
    id: number;
    documentType: string;
    fileUrl?: string | null;
    fileName?: string | null;
    status?: string;
    expiresAt?: string | null;
    createdAt?: string;
}

/** ServiceProviderProfile nested in GET /organizations/:id */
export interface OrganizationByIdServiceProviderProfile {
    id?: number;
    organizationId?: number;
    licenseNumber?: string | null;
    serviceCategories?: string[] | null;
    yearsExperience?: number | null;
    areaId?: number | null;
    cityId?: number | null;
    street?: string | null;
    amount?: string | null;
    createdAt?: string;
    updatedAt?: string;
    Area?: { id: number; name: string } | null;
    City?: { id: number; name: string } | null;
    ServiceProviderDocuments?: ServiceProviderDocumentItem[];
}

/** Branch in GET /organizations/:id response (Branches array) */
export interface OrganizationByIdBranch {
    id: number;
    nameEn?: string;
    nameAr?: string;
    status?: string;
    Area?: { id: number; name: string } | null;
}

/** Approval history entry in GET /organizations/:id response (OrganizationApprovals array) */
export interface OrganizationByIdApproval {
    id: number;
    status: string;
    rejectionReason?: string | null;
    createdAt: string;
    User?: { id: number; fullName: string; email: string } | null;
}

/** Full organization from GET /api/organizations/:id */
export interface OrganizationByIdFull {
    id: number;
    name: string;
    nameAr?: string | null;
    type: string;
    status: string;
    rejectionReason?: string | null;
    approvedAt?: string | null;
    approvedByUserId?: number | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    logoUrl?: string | null;
    isActive?: boolean;
    City?: { id: number; name: string } | null;
    FuelStationProfile?: { id: number; organizationId: number; registrationNumber: string | null } | null;
    createdAt: string;
    updatedAt: string;
    Users?: OrganizationByIdUser[];
    OrganizationDocuments?: OrganizationByIdDocument[];
    ServiceProviderProfile?: OrganizationByIdServiceProviderProfile | null;
    Branches?: OrganizationByIdBranch[];
    OrganizationApprovals?: OrganizationByIdApproval[];
    owner?: OrganizationMeFullOwner | null;
}

export interface OrganizationByIdResponse {
    success: boolean;
    data: OrganizationByIdFull;
    message?: string;
}

/** List organizations (Authority). GET /api/organizations?status=&type=&page=&limit= */
export interface OrganizationsListData {
    items: OrganizationProfile[];
    total: number;
    page: number;
    limit: number;
}

export interface OrganizationsListResponse {
    success: boolean;
    data: OrganizationsListData;
    message?: string;
}

/** Approve/Reject. POST /api/organizations/:id/approve */
export interface ApproveOrganizationBody {
    decision: "APPROVED" | "REJECTED";
    reason?: string;
}

export type OrganizationDocumentType = "LICENSE" | "REGISTRATION" | "OTHER";

export interface OrganizationDocument {
    id: number;
    organizationId: number;
    documentType: OrganizationDocumentType;
    url?: string;
    fileUrl?: string;
    fileName?: string;
    createdAt?: string;
}

export interface OrganizationDocumentsResponse {
    success: boolean;
    data: OrganizationDocument[];
    message?: string;
}

export interface ApprovalHistoryItem {
    id?: number;
    decision: "APPROVED" | "REJECTED";
    reason?: string | null;
    approvedByUserId?: number | null;
    createdAt: string;
}

export interface OrganizationApprovalHistoryResponse {
    success: boolean;
    data: ApprovalHistoryItem[];
    message?: string;
}

export interface OrganizationServiceCategoriesResponse {
    success: boolean;
    data: ServiceCategory[];
    message?: string;
}

/** Service Offerings: /api/organizations/:id/service-offerings */
export interface ServiceOffering {
    id: number;
    organizationId: number;
    serviceCategoryId: number;
    cityId: number;
    governorateId: number;
    amount: number | string;
    currency: string;
    createdAt: string;
    updatedAt: string;
    ServiceCategory?: {
        id: number;
        nameEn?: string;
        nameAr?: string;
        code?: string;
    };
    City?: {
        id: number;
        name?: string;
        code?: string;
    };
    Governorate?: {
        id: number;
        name?: string;
        code?: string;
    };
}

export interface ServiceOfferingsListResponse {
    success: boolean;
    data: ServiceOffering[];
    message?: string;
}

export interface ServiceOfferingResponse {
    success: boolean;
    data: ServiceOffering;
    message?: string;
}

export interface ServiceOfferingsFilter {
    serviceCategoryId?: number;
    cityId?: number;
    governorateId?: number;
}

export interface CreateServiceOfferingBody {
    serviceCategoryId: number;
    cityId: number;
    governorateId: number;
    amount: number;
    currency?: string;
}

export interface UpdateServiceOfferingBody {
    amount?: number;
    currency?: string;
}

/** Service Provider Profile. GET/POST/PATCH/DELETE .../service-provider-profile */
export interface ServiceProviderProfile {
    id?: number;
    organizationId?: number;
    licenseNumber?: string | null;
    yearsExperience?: number | null;
    areaId?: number | null;
    cityId?: number | null;
    street?: string | null;
    serviceCategories?: string[] | null;
    Area?: { id: number; name: string; code?: string } | null;
    City?: { id: number; name: string; code?: string } | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface ServiceProviderProfileResponse {
    success: boolean;
    data: ServiceProviderProfile;
    message?: string;
}

export interface ServiceProviderProfileBody {
    licenseNumber?: string;
    yearsExperience?: number;
    areaId?: number;
    cityId?: number;
    street?: string;
    serviceCategories?: string[];
}

/** Profile documents: COMMERCIAL_REGISTRATION | TAX_CERTIFICATE | TECHNICAL_CERTIFICATE | INSURANCE_CERTIFICATE */
export type ServiceProviderProfileDocumentType =
    | "COMMERCIAL_REGISTRATION"
    | "TAX_CERTIFICATE"
    | "TECHNICAL_CERTIFICATE"
    | "INSURANCE_CERTIFICATE";

export interface ServiceProviderProfileDocument {
    id: number;
    documentType: ServiceProviderProfileDocumentType;
    url?: string;
    fileUrl?: string;
    fileName?: string;
    createdAt?: string;
}

export interface ServiceProviderProfileDocumentsResponse {
    success: boolean;
    data: ServiceProviderProfileDocument[];
    message?: string;
}
