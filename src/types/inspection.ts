export type InspectionTargetType = "FUEL_STATION" | "SERVICE_PROVIDER";

export interface InspectionBranch {
  id: number;
  nameEn?: string | null;
  nameAr?: string | null;
}

export interface InspectionTargetOrganization {
  id: number;
  name: string;
  type: InspectionTargetType;
}

export interface InspectionInspector {
  id: number;
  fullName: string;
}

export interface Inspection {
  id: number;
  authorityOrganizationId: number;
  branchId: number | null;
  inspectorUserId: number;
  targetType: InspectionTargetType;
  targetOrganizationId: number;
  findings: { notes?: string } | null;
  createdAt: string;
  updatedAt: string;
  Branch?: InspectionBranch | null;
  TargetOrganization?: InspectionTargetOrganization | null;
  Inspector?: InspectionInspector | null;
}

export interface InspectionsListResponse {
  success?: boolean;
  data?: Inspection[];
  message?: string;
}

export interface InspectionResponse {
  success?: boolean;
  data?: Inspection;
  message?: string;
}

export interface CreateInspectionBody {
  targetType: InspectionTargetType;
  targetOrganizationId: number;
  branchId?: number | null;
  findings?: { notes?: string } | null;
}
