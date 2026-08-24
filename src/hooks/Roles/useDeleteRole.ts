import axiosInstance from "@/api/config";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";

/** AUTHORITY → roles; SERVICE_PROVIDER → roles; FUEL_STATION → rbac/roles */
const ROLES_ENDPOINT_BY_ORG_TYPE: Record<string, string> = {
  AUTHORITY: "roles",
  SERVICE_PROVIDER: "roles",
  FUEL_STATION: "rbac/roles",
  SUPER_ADMIN: "roles",
};

const deleteRole = async (endpoint: string, id: string | number) => {
  try {
    const response = await axiosInstance.delete(`${endpoint}/${id}`);
    return response.data;
  } catch (err) {
    const withResponse = err as { response?: { data?: { message?: string } } };
    const message =
      typeof withResponse.response?.data?.message === "string"
        ? withResponse.response.data.message
        : err instanceof Error
        ? err.message
        : "Failed to delete role.";
    throw new Error(message);
  }
};

export default function useDeleteRole() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();
  const orgType = organization?.type ?? "SERVICE_PROVIDER";
  const endpoint = ROLES_ENDPOINT_BY_ORG_TYPE[orgType] ?? "rbac/roles";

  return useMutation({
    mutationFn: (id: string | number) => deleteRole(endpoint, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}
