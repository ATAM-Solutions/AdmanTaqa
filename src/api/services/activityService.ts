import axiosInstance from "../config";
import type { ActivityOrder, ActivityPage, ActivityRoot } from "@/types/activity";

/** Each timeline lives next to the record it describes and is guarded by the same permission and scope as that record. */
const PATH: Record<ActivityRoot, (id: number | string) => string> = {
  report: (id) => `maintenance-issues/${id}/activity`,
  workOrder: (id) => `internal/work-orders/${id}/activity`,
  task: (id) => `internal-tasks/${id}/activity`,
  stationRequest: (id) => `station/requests/${id}/activity`,
};

export const activityPath = (root: ActivityRoot, id: number | string) => PATH[root](id);

export async function fetchActivity(
  root: ActivityRoot,
  id: number | string,
  params: { page: number; limit: number; order: ActivityOrder },
): Promise<ActivityPage> {
  const res = await axiosInstance.get<{ data?: ActivityPage }>(PATH[root](id), { params });
  const data = res.data?.data;
  return {
    items: Array.isArray(data?.items) ? data!.items : [],
    pagination: data?.pagination ?? { page: params.page, limit: params.limit, total: 0, totalPages: 1 },
    order: data?.order ?? params.order,
  };
}
