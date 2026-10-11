export interface Country {
    id: number;
    name: string;
    /** Arabic display name (null for legacy rows). `name` is the English/legacy name. */
    nameAr?: string | null;
    nameEn?: string;
    isActive?: boolean;
    code: string;
    createdAt: string;
    updatedAt: string;
}

export interface Governorate {
    id: number;
    countryId: number;
    name: string;
    /** Arabic display name (null for legacy rows). `name` is the English/legacy name. */
    nameAr?: string | null;
    nameEn?: string;
    isActive?: boolean;
    code: string;
    createdAt: string;
    updatedAt: string;
}

export interface City {
    id: number;
    governorateId: number;
    name: string;
    /** Arabic display name (null for legacy rows). `name` is the English/legacy name. */
    nameAr?: string | null;
    nameEn?: string;
    isActive?: boolean;
    code: string;
    createdAt: string;
    updatedAt: string;
}

export interface Area {
    id: number;
    cityId: number;
    name: string;
    /** Arabic display name (null for legacy rows). `name` is the English/legacy name. */
    nameAr?: string | null;
    nameEn?: string;
    isActive?: boolean;
    code: string;
    createdAt: string;
    updatedAt: string;
}

/** Area with optional coordinates from GET locations/areas/:id */
export interface AreaDetails extends Area {
    latitude?: number | null;
    longitude?: number | null;
}

export interface CountriesResponse {
    success: boolean;
    data: Country[];
}

export interface CountryResponse {
    success: boolean;
    data: Country;
}

export interface GovernoratesResponse {
    success: boolean;
    data: Governorate[];
}

export interface CitiesResponse {
    success: boolean;
    data: City[];
}

export interface AreasResponse {
    success: boolean;
    data: Area[];
}

/**
 * Geography levels as the API names them. NOTE the storage names: a "region" (منطقة) is persisted in the
 * `Governorate` table and a "district" (حي) in the `Area` table — never label them "governorate"/"area" in the UI.
 */
export type GeographyLevel = "country" | "region" | "city" | "district";

export interface GeographyNode {
    id: number;
    level: GeographyLevel;
    parentId: number | null;
    name: string;
    nameEn: string;
    nameAr: string | null;
    code: string | null;
    isActive: boolean;
    source: string | null;
    createdAt: string;
    updatedAt: string;
    /** Management listing only. */
    childCount?: number;
    referenceCount?: number;
}

export interface GeographyListMeta {
    total: number;
    page: number;
    limit: number;
}

export interface GeographyListResponse {
    success: boolean;
    data: GeographyNode[];
    meta: GeographyListMeta;
}
