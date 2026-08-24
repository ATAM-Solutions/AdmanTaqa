import axiosInstance from "@/api/config";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import type { RoleItem, RolesListResponse } from "@/types/role";
import { normalizeRolesList } from "./utils";

/** SERVICE_PROVIDER (and others) → GET /api/rbac/roles; AUTHORITY → GET /api/roles */
const ROLES_ENDPOINT_BY_ORG_TYPE: Record<string, string> = {
  AUTHORITY: "roles",
  SERVICE_PROVIDER: "roles",
  FUEL_STATION: "rbac/roles",
  SUPER_ADMIN: "roles",
};

export default function useGetRoles() {
  const { organization } = useAuth();
  const orgType = organization?.type ?? "SERVICE_PROVIDER";
  const endpoint = ROLES_ENDPOINT_BY_ORG_TYPE[orgType] ?? "rbac/roles";

  return useQuery({
    queryKey: ["roles", endpoint],
    queryFn: async (): Promise<RoleItem[]> => {
      const response = await axiosInstance.get<RolesListResponse>(endpoint);
      return normalizeRolesList(response.data);
    },
  });
}
