export interface OperatorLinkedUser {
  id: number;
  fullName: string;
  email: string;
  phone?: string | null;
  isActive: boolean;
}

export interface OperatorItem {
  id: number;
  organizationId: number;
  name: string;
  userId?: number | null;
  createdAt?: string;
  updatedAt?: string;
  LinkedUser?: OperatorLinkedUser | null;
}

export interface OperatorTeamMember {
  id: number;
  fullName: string;
  email: string;
  phone?: string | null;
}

export interface OperatorsListResponse {
  success?: boolean;
  data?: OperatorItem[];
  message?: string;
}

export interface OperatorResponse {
  success?: boolean;
  data?: OperatorItem;
  message?: string;
}

export interface TeamMembersListResponse {
  success?: boolean;
  data?: OperatorTeamMember[];
  message?: string;
}

export interface CreateOperatorBody {
  name: string;
  userId?: number | null;
}

export interface UpdateOperatorBody {
  name?: string;
  userId?: number | null;
}
