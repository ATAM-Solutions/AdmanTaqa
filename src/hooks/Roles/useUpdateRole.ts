import axiosInstance from "@/api/config";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import type { UpdateRoleBody } from "@/types/role";

/** AUTHORITY → roles; SERVICE_PROVIDER / FUEL_STATION → rbac/roles */
const ROLES_ENDPOINT_BY_ORG_TYPE: Record<string, string> = {
  AUTHORITY: "roles",
  SERVICE_PROVIDER: "roles",
  FUEL_STATION: "rbac/roles",
  SUPER_ADMIN: "roles",
};

const updateRole = async ({
  endpoint,
  id,
  body,
}: {
  endpoint: string;
  id: string | number;
  body: UpdateRoleBody;
}) => {
  try {
    const response = await axiosInstance.patch(`${endpoint}/${id}`, body);
    return response.data;
  } catch (err) {
    const withResponse = err as { response?: { data?: { message?: string } } };
    const message =
      typeof withResponse.response?.data?.message === "string"
        ? withResponse.response.data.message
        : err instanceof Error
        ? err.message
        : "Failed to update role.";
    throw new Error(message);
  }
};

export default function useUpdateRole() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();
  const orgType = organization?.type ?? "SERVICE_PROVIDER";
  const endpoint = ROLES_ENDPOINT_BY_ORG_TYPE[orgType] ?? "rbac/roles";

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string | number;
      body: UpdateRoleBody;
    }) => updateRole({ endpoint, id, body }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["role", variables.id] });
    },
  });
}
