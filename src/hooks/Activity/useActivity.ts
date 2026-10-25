import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchActivity } from "@/api/services/activityService";
import { useAuth } from "@/context/AuthContext";
import type { ActivityOrder, ActivityRoot } from "@/types/activity";

/** Events per request: the timeline is loaded in bounded pages ("Load more"), never all at once. */
export const ACTIVITY_PAGE_SIZE = 30;

/** The key carries the VIEWER's company, so one company's history is never served from another's cache. */
export const activityQueryKey = (orgId: number | null | undefined, root: ActivityRoot, id: number | string, order: ActivityOrder) => ["activity", orgId ?? null, root, String(id), order] as const;

export function useActivity(root: ActivityRoot, id: number | string | undefined, order: ActivityOrder, enabled = true) {
  const orgId = useAuth().organization?.id;
  return useInfiniteQuery({
    queryKey: activityQueryKey(orgId, root, id ?? "", order),
    queryFn: ({ pageParam }) => fetchActivity(root, id!, { page: pageParam, limit: ACTIVITY_PAGE_SIZE, order }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined),
    enabled: enabled && id != null,
    // 4xx answers are decisions (no access / not found), not blips
    retry: (count, error) => {
      const status = (error as { response?: { status?: number } } | null)?.response?.status;
      return (status == null || status >= 500) && count < 2;
    },
  });
}
