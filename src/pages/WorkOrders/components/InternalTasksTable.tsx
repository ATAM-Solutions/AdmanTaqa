import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { InternalTaskItem, InternalTaskStatus } from "@/types/internalTask";
import InternalTaskStatusBadge from "./InternalTaskStatusBadge";
import useUpdateInternalTaskStatus from "@/hooks/WorkOrders/useUpdateInternalTaskStatus";
import useReviewInternalTask from "@/hooks/WorkOrders/useReviewInternalTask";
import useCloseInternalTask from "@/hooks/WorkOrders/useCloseInternalTask";
import useUploadInternalTaskAttachment from "@/hooks/WorkOrders/useUploadInternalTaskAttachment";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/i18n/formatters";

type Props = {
  items: InternalTaskItem[];
};

const STATUS_OPTIONS: InternalTaskStatus[] = [
  "ASSIGNED",
  "IN_PROGRESS",
  "PAUSED",
  "WAITING_PARTS",
  "COMPLETED",
  "CLOSED",
];

export default function InternalTasksTable({ items }: Props) {
  const { t, i18n } = useTranslation("workOrders");
  const { hasPermission } = useAuth();
  const [startTask, setStartTask] = useState<InternalTaskItem | null>(null);
  const [startMessage, setStartMessage] = useState("");
  const updateStatusMutation = useUpdateInternalTaskStatus();
  const reviewMutation = useReviewInternalTask();
  const closeMutation = useCloseInternalTask();
  const uploadAttachmentMutation = useUploadInternalTaskAttachment();

  const handleStatusChange = (task: InternalTaskItem, status: InternalTaskStatus) => {
    updateStatusMutation.mutate(
      { id: task.id, body: { status }, workOrderId: task.workOrderId },
      {
        onSuccess: () => toast.success(t("internalTasksTable.toasts.statusUpdated")),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : t("internalTasksTable.toasts.statusUpdateFailed")),
      }
    );
  };

  const handleReview = (task: InternalTaskItem, decision: "APPROVE" | "REJECT") => {
    reviewMutation.mutate(
      { id: task.id, body: { decision }, workOrderId: task.workOrderId },
      {
        onSuccess: () =>
          toast.success(
            decision === "APPROVE"
              ? t("internalTasksTable.toasts.approved")
              : t("internalTasksTable.toasts.rejected")
          ),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : t("internalTasksTable.toasts.reviewFailed")),
      }
    );
  };

  const handleClose = (task: InternalTaskItem) => {
    closeMutation.mutate(
      { id: task.id, workOrderId: task.workOrderId },
      {
        onSuccess: () => toast.success(t("internalTasksTable.toasts.closed")),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : t("internalTasksTable.toasts.closeFailed")),
      }
    );
  };

  const handleAttachmentUpload = (task: InternalTaskItem, file: File) => {
    uploadAttachmentMutation.mutate(
      { id: task.id, file, workOrderId: task.workOrderId },
      {
        onSuccess: () => toast.success(t("internalTasksTable.toasts.attachmentUploaded")),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : t("internalTasksTable.toasts.attachmentUploadFailed")),
      }
    );
  };

  const handleStartSubmit = () => {
    if (!startTask) return;
    updateStatusMutation.mutate(
      {
        id: startTask.id,
        body: { status: "IN_PROGRESS", message: startMessage.trim() || undefined },
        workOrderId: startTask.workOrderId,
      },
      {
        onSuccess: () => {
          toast.success(t("internalTasksTable.toasts.started"));
          setStartTask(null);
          setStartMessage("");
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : t("internalTasksTable.toasts.startFailed")),
      }
    );
  };

  const canUpdateStatus = hasPermission("internal_tasks.update_status");
  const canReview = hasPermission("internal_tasks.review");
  const canClose = hasPermission("internal_tasks.close");
  const canUpload = hasPermission("internal_tasks.upload");

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("internalTasksTable.id")}</TableHead>
            <TableHead>{t("internalTasksTable.title")}</TableHead>
            <TableHead>{t("internalTasksTable.status")}</TableHead>
            <TableHead>{t("internalTasksTable.assignedUser")}</TableHead>
            <TableHead>{t("internalTasksTable.created")}</TableHead>
            <TableHead className="text-end">{t("internalTasksTable.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                {t("internalTasksTable.noResults")}
              </TableCell>
            </TableRow>
          ) : (
            items.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="font-mono text-xs">{task.id}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium">{task.title ?? t("internalTasksTable.internalTaskFallback")}</p>
                    {task.description ? (
                      <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <InternalTaskStatusBadge status={task.status} />
                </TableCell>
                <TableCell>{task.assignedUserId ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(task.createdAt, i18n.language, { dateStyle: "medium", timeStyle: "short" })}
                </TableCell>
                <TableCell className="text-end">
                  <div className="flex flex-wrap gap-2 justify-end">
                    {task.status === "ASSIGNED" && canUpdateStatus ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          setStartTask(task);
                          setStartMessage("");
                        }}
                        disabled={updateStatusMutation.isPending}
                      >
                        {t("internalTasksTable.start")}
                      </Button>
                    ) : null}
                    {canUpdateStatus ? (
                      <Select
                        value={task.status}
                        onValueChange={(value: InternalTaskStatus) =>
                          handleStatusChange(task, value)
                        }
                      >
                        <SelectTrigger className="w-[160px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status.replaceAll("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
                    {canReview ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReview(task, "APPROVE")}
                          disabled={reviewMutation.isPending}
                        >
                          {t("internalTasksTable.approve")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReview(task, "REJECT")}
                          disabled={reviewMutation.isPending}
                        >
                          {t("internalTasksTable.reject")}
                        </Button>
                      </>
                    ) : null}
                    {canClose ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleClose(task)}
                        disabled={closeMutation.isPending}
                      >
                        {t("internalTasksTable.close")}
                      </Button>
                    ) : null}
                    {canUpload ? (
                      <label className="inline-flex">
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            handleAttachmentUpload(task, file);
                            e.currentTarget.value = "";
                          }}
                        />
                        <span className="inline-flex h-8 items-center rounded-md border px-3 text-xs cursor-pointer">
                          {t("internalTasksTable.upload")}
                        </span>
                      </label>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <Dialog
        open={startTask != null}
        onOpenChange={(open) => {
          if (!open) {
            setStartTask(null);
            setStartMessage("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("internalTasksTable.startDialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="start-message" className="text-sm">
              {t("internalTasksTable.messageOptional")}
            </Label>
            <Textarea
              id="start-message"
              value={startMessage}
              onChange={(e) => setStartMessage(e.target.value)}
              placeholder={t("internalTasksTable.messagePlaceholder")}
              className="min-h-[80px] resize-y"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setStartTask(null);
                setStartMessage("");
              }}
            >
              {t("internalTasksTable.cancel")}
            </Button>
            <Button
              onClick={handleStartSubmit}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? t("internalTasksTable.submitting") : t("internalTasksTable.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
