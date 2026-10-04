export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

export interface NotificationEntity {
  type:
    | "maintenance_issue"
    | "job_order"
    | "external_request"
    | "internal_work_order"
    | "internal_task"
    | "warehouse_order"
    | "report"
    | string;
  id: number;
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  body?: string | null;
  deepLink?: string | null;
  metadata?: Record<string, unknown> | null;
  /** Localized renderings (additive, derived server-side from `type` + `metadata`; null for ad-hoc types). */
  titleEn?: string | null;
  bodyEn?: string | null;
  titleAr?: string | null;
  bodyAr?: string | null;
  /** What the notification points at, e.g. { type: "maintenance_issue", id: 12 }. */
  entity?: NotificationEntity | null;
  isRead: boolean;
  priority?: NotificationPriority | null;
  createdAt: string;
}

export interface NotificationsListData {
  items: NotificationItem[];
  total: number;
}

export interface NotificationsListResponse {
  success?: boolean;
  data?: NotificationsListData;
  message?: string;
}

export interface UnreadCountResponse {
  success?: boolean;
  data?: { count: number };
  message?: string;
}
