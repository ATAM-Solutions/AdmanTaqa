import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/patterns/PageHeader";
import { AsyncBoundary } from "@/components/patterns/AsyncBoundary";
import TablePagination from "@/components/TablePagination";
import { CheckCheck, Bell } from "lucide-react";
import { formatDate } from "@/lib/i18n/formatters";
import useGetNotifications from "@/hooks/Notifications/useGetNotifications";
import useMarkNotificationRead from "@/hooks/Notifications/useMarkNotificationRead";
import useMarkAllNotificationsRead from "@/hooks/Notifications/useMarkAllNotificationsRead";
import type { NotificationItem } from "@/types/notification";

const LIMIT = 20;

export default function Notifications() {
  const { t, i18n } = useTranslation("notifications");
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const { data, isLoading, error } = useGetNotifications({
    page,
    limit: LIMIT,
    isRead: filter === "all" ? undefined : filter === "read",
  });
  const items = useMemo(() => data?.data?.items ?? [], [data]);
  const total = data?.data?.total ?? 0;

  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const handleItemClick = (item: NotificationItem) => {
    if (!item.isRead) markReadMutation.mutate(item.id);
    if (item.deepLink) navigate(item.deepLink);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title={t("page.title")}
        description={t("page.subtitle")}
        action={
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            <CheckCheck className="h-4 w-4" />
            {t("bell.markAllRead")}
          </Button>
        }
      />

      <Card className="border-none shadow-xl bg-card/70 backdrop-blur-md">
        <CardContent className="pt-6 space-y-4">
          <Select
            value={filter}
            onValueChange={(v) => {
              setFilter(v as "all" | "unread" | "read");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("page.filterAll")}</SelectItem>
              <SelectItem value="unread">{t("page.filterUnread")}</SelectItem>
              <SelectItem value="read">{t("page.filterRead")}</SelectItem>
            </SelectContent>
          </Select>

          <AsyncBoundary
            isLoading={isLoading}
            error={error}
            isEmpty={items.length === 0}
            loadingFallback={<div className="py-12 text-center text-muted-foreground">{t("bell.loading")}</div>}
            emptyFallback={
              <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-2">
                <Bell className="h-8 w-8 opacity-40" />
                {t("bell.empty")}
              </div>
            }
          >
            <div className="divide-y rounded-lg border">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={`w-full text-start px-4 py-4 hover:bg-muted/50 transition-colors flex items-start gap-3 ${
                    !item.isRead ? "bg-primary/5" : ""
                  }`}
                >
                  {!item.isRead && <span className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                  <div className={`min-w-0 flex-1 ${item.isRead ? "ms-5" : ""}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{item.title}</p>
                      {item.priority === "CRITICAL" || item.priority === "HIGH" ? (
                        <Badge variant="destructive" className="text-[10px] shrink-0">
                          {t(`priority.${item.priority}`)}
                        </Badge>
                      ) : null}
                    </div>
                    {item.body && <p className="text-sm text-muted-foreground mt-1">{item.body}</p>}
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {formatDate(item.createdAt, i18n.language, { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </AsyncBoundary>

          {total > LIMIT && (
            <TablePagination
              currentPage={page}
              totalPages={Math.ceil(total / LIMIT)}
              total={total}
              pageSize={LIMIT}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
