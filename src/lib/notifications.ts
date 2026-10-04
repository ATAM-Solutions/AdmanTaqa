import type { NotificationItem } from "@/types/notification";

/** Title/body in the active UI language, falling back to the stored (English) text. */
export function getNotificationText(
  item: Pick<NotificationItem, "title" | "body" | "titleAr" | "bodyAr">,
  language: string
): { title: string; body: string | null } {
  if (language.startsWith("ar") && item.titleAr) {
    return { title: item.titleAr, body: item.bodyAr ?? item.body ?? null };
  }
  return { title: item.title, body: item.body ?? null };
}

/**
 * Web-admin route for a notification's target, or null when the admin has no page for it.
 * `deepLink` is deliberately NOT used: those paths are the mobile app's routes (e.g.
 * "/maintenance-issues/details?id=12"), which do not exist in this router.
 * The target page still enforces the viewer's own permissions, so a deleted or inaccessible
 * entity ends in that page's not-found / access-denied state rather than leaking anything here.
 */
export function getNotificationWebPath(
  item: Pick<NotificationItem, "entity">,
  organizationType: string | undefined | null
): string | null {
  const entity = item.entity;
  if (!entity || !Number.isInteger(entity.id) || entity.id <= 0) return null;
  const id = entity.id;
  const isStation = organizationType === "FUEL_STATION";
  const isProvider = organizationType === "SERVICE_PROVIDER";
  switch (entity.type) {
    case "maintenance_issue":
      return isStation ? `/maintenance-reports/${id}` : null;
    case "internal_work_order":
      return isStation ? `/internal-work-orders/${id}` : null;
    case "external_request":
      return isStation ? `/station-requests/${id}` : isProvider ? `/provider-rfqs/${id}` : null;
    case "job_order":
      return isStation ? `/station-job-orders/${id}` : isProvider ? `/provider-job-orders/${id}` : null;
    default:
      return null;
  }
}
