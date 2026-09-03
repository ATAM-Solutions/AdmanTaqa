export interface User {
    id: number;
    email: string;
    fullName: string;
    organizationId: number;
}

export interface AuthRole {
    id: number | string;
    name: string;
    organizationId?: number | null;
    isSystem?: boolean;
}

export interface Organization {
    id: number;
    name: string;
    type: "FUEL_STATION" | "SERVICE_PROVIDER" | "AUTHORITY" | "SUPER_ADMIN";
    status: "PENDING" | "APPROVED" | "REJECTED";
    /** Company branding / profile (present on login + /auth/me since the company-management release). */
    nameAr?: string | null;
    logoUrl?: string | null;
    isActive?: boolean;
    email?: string | null;
    phone?: string | null;
}

export interface AuthData {
    user: User;
    organization: Organization;
    roles?: AuthRole[];
    permissions?: string[];
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
}

export interface AuthResponse {
    success: boolean;
    data: AuthData;
    message?: string;
}

/** register-v2 API can return documentsReceived */
export interface RegisterV2Response extends AuthResponse {
    documentsReceived?: {
        organization?: string[];
        serviceProvider?: string[];
    };
}

export interface MeData {
    user: User;
    organization: Organization;
    roles?: AuthRole[];
    permissions?: string[];
}

export interface MeResponse {
    success: boolean;
    data: MeData;
    message?: string;
}
