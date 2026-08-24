export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  body?: string | null;
  deepLink?: string | null;
  metadata?: Record<string, unknown> | null;
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
