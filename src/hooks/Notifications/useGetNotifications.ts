import axiosInstance from "@/api/config";
import { useQuery } from "@tanstack/react-query";
import type { NotificationsListResponse } from "@/types/notification";

export interface GetNotificationsParams {
  page?: number;
  limit?: number;
  isRead?: boolean;
}

const getNotifications = async (
  params?: GetNotificationsParams
): Promise<NotificationsListResponse> => {
  const searchParams = new URLSearchParams();
  if (params?.page != null) searchParams.set("page", String(params.page));
  if (params?.limit != null) searchParams.set("limit", String(params.limit));
  if (params?.isRead != null) searchParams.set("isRead", String(params.isRead));
  const query = searchParams.toString();
  const url = query ? `notifications?${query}` : "notifications";
  const response = await axiosInstance.get<NotificationsListResponse>(url);
  return response.data;
};

export default function useGetNotifications(params?: GetNotificationsParams) {
  return useQuery({
    queryKey: ["notifications", params],
    queryFn: () => getNotifications(params),
  });
}
