import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDate } from "@/lib/i18n/formatters";
import useGetUnreadCount from "@/hooks/Notifications/useGetUnreadCount";
import useGetNotifications from "@/hooks/Notifications/useGetNotifications";
import useMarkNotificationRead from "@/hooks/Notifications/useMarkNotificationRead";
import useMarkAllNotificationsRead from "@/hooks/Notifications/useMarkAllNotificationsRead";
import type { NotificationItem } from "@/types/notification";
import { useAuth } from "@/context/AuthContext";
import { getNotificationText, getNotificationWebPath } from "@/lib/notifications";

export default function NotificationBell() {
  const { t, i18n } = useTranslation("notifications");
  const navigate = useNavigate();
  const { organization } = useAuth();

  const { data: unreadData } = useGetUnreadCount();
  const unreadCount = unreadData?.data?.count ?? 0;

  const { data, isLoading } = useGetNotifications({ limit: 8 });
  const items = data?.data?.items ?? [];

  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const handleItemClick = (item: NotificationItem) => {
    if (!item.isRead) markReadMutation.mutate(item.id);
    const target = getNotificationWebPath(item, organization?.type);
    if (target) navigate(target);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t("bell.ariaLabel")}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -end-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <p className="text-sm font-bold">{t("bell.title")}</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {t("bell.markAllRead")}
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{t("bell.loading")}</div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{t("bell.empty")}</div>
          ) : (
            <div className="divide-y">
              {items.map((item) => {
                const text = getNotificationText(item, i18n.language);
                return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={`w-full text-start px-4 py-3 hover:bg-muted/50 transition-colors ${
                    !item.isRead ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!item.isRead && <span className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                    <div className={`min-w-0 ${item.isRead ? "ms-4" : ""}`}>
                      <p className="text-sm font-semibold truncate">{text.title}</p>
                      {text.body && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{text.body}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDate(item.createdAt, i18n.language, { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                  </div>
                </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <div className="border-t px-4 py-2.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => navigate("/notifications")}
          >
            {t("bell.viewAll")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
