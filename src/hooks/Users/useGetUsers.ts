import axiosInstance from "@/api/config";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { fetchAllCompanyUsers } from "@/lib/userDirectory";
import type { ApiUser, UsersListResponse } from "@/types/user";

type GetUsersParams = { organizationId?: number | string };

function getUsers(params?: GetUsersParams) {
  const q = params?.organizationId != null ? `?organizationId=${params.organizationId}` : "";
  return axiosInstance.get<UsersListResponse>(`users${q}`).then((r) => r.data);
}

/** Own-company listing for a manager who holds team.read but not users.read (same per-user shape as /users). */
async function getOwnCompanyUsers(): Promise<UsersListResponse> {
  const data = await fetchAllCompanyUsers(async (page, limit) => {
    const res = await axiosInstance.get<{ data?: { items?: ApiUser[]; total?: number } }>("organizations/me/users", {
      params: { page, limit },
    });
    return { items: res.data?.data?.items ?? [], total: res.data?.data?.total ?? 0 };
  });
  return { success: true, data };
}

export default function useGetUsers(params?: GetUsersParams) {
  const { hasPermission } = useAuth();
  const ownCompanyOnly = !hasPermission("users.read") && hasPermission("team.read") && params?.organizationId == null;
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => (ownCompanyOnly ? getOwnCompanyUsers() : getUsers(params)),
  });
}
