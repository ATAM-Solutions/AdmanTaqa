import axiosInstance from "@/api/config";
import { useQuery } from "@tanstack/react-query";
import type { UnreadCountResponse } from "@/types/notification";

const getUnreadCount = async (): Promise<UnreadCountResponse> => {
  const response = await axiosInstance.get<UnreadCountResponse>("notifications/unread-count");
  return response.data;
};

export default function useGetUnreadCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: getUnreadCount,
    refetchInterval: 60_000,
  });
}
