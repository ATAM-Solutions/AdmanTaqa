import axiosInstance from "@/api/config";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { userDetailPath } from "@/lib/userDirectory";
import type { ApiUser, UserDetailResponse } from "@/types/user";

async function getUserById(id: number | string, canReadUsers: boolean): Promise<ApiUser | null> {
  const res = await axiosInstance.get<UserDetailResponse>(userDetailPath(id, canReadUsers));
  return res.data?.data ?? null;
}

export default function useGetUserById(id: number | string | null | undefined) {
  const { hasPermission } = useAuth();
  const canReadUsers = hasPermission("users.read");
  return useQuery({
    queryKey: ["user", id],
    queryFn: () => getUserById(id!, canReadUsers),
    enabled: id != null && id !== "",
  });
}
