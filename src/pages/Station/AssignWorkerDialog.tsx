import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAssignableTechnicians, useAssignWorker } from "@/hooks/WorkOrders/useAssignWorker";
import { AssignmentError } from "@/api/services/internalTaskService";

type Props = {
  orderId: number;
  /** Present → reassign this task; absent → create a new assigned task. */
  task?: { id: number; assignedUserId?: number | null; assigneeName?: string | null } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const KNOWN_CODES = [
  "ASSIGNEE_INVALID",
  "ASSIGNEE_INACTIVE",
  "ASSIGNEE_OUT_OF_SCOPE",
  "ALREADY_ASSIGNED",
  "TASK_CLOSED",
  "WORK_ORDER_CLOSED",
  "TASK_BRANCH_MISMATCH",
  "BRANCH_ACCESS_DENIED",
] as const;

export default function AssignWorkerDialog({ orderId, task, open, onOpenChange }: Props) {
  const { t } = useTranslation("station");
  const [workerId, setWorkerId] = useState("");
  const [notes, setNotes] = useState("");
  const candidates = useAssignableTechnicians(orderId, open);
  const assign = useAssignWorker(orderId);
  const reassigning = task != null;

  // The parent mounts this dialog per target (keyed), so the form always starts empty.
  // Offer everyone the server says may work this station, minus the current assignee on reassignment.
  const options = (candidates.data ?? []).filter((u) => u.id !== task?.assignedUserId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId) return;
    assign.mutate(
      { assignedUserId: Number(workerId), taskId: task?.id, notes: notes.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(t(reassigning ? "assignWorker.toasts.reassigned" : "assignWorker.toasts.assigned"));
          onOpenChange(false);
        },
        onError: (err) => {
          const code = err instanceof AssignmentError ? err.code : null;
          if (code && (KNOWN_CODES as readonly string[]).includes(code)) {
            toast.error(t(`assignWorker.errors.${code}`));
          } else {
            toast.error(t("assignWorker.errors.generic"));
          }
          // The candidate list or the task may have changed under us — re-read both.
          setWorkerId("");
          candidates.refetch();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t(reassigning ? "assignWorker.reassignTitle" : "assignWorker.title")}</DialogTitle>
          <DialogDescription>
            {reassigning && task?.assigneeName
              ? t("assignWorker.currentlyAssigned", { name: task.assigneeName })
              : t("assignWorker.description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assign-worker">{t("assignWorker.workerLabel")}</Label>
            {candidates.isLoading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                <Loader2 className="h-4 w-4 animate-spin" /> {t("assignWorker.loading")}
              </p>
            ) : candidates.isError ? (
              <div className="space-y-2" role="alert">
                <p className="text-sm text-destructive">
                  {candidates.error instanceof AssignmentError && candidates.error.status === 403
                    ? t("assignWorker.errors.BRANCH_ACCESS_DENIED")
                    : t("assignWorker.loadFailed")}
                </p>
                <Button type="button" variant="outline" size="sm" onClick={() => candidates.refetch()}>
                  {t("assignWorker.retry")}
                </Button>
              </div>
            ) : options.length === 0 ? (
              <p className="text-sm text-muted-foreground" role="status">
                {t("assignWorker.empty")}
              </p>
            ) : (
              <Select value={workerId} onValueChange={setWorkerId}>
                <SelectTrigger id="assign-worker">
                  <SelectValue placeholder={t("assignWorker.select")} />
                </SelectTrigger>
                <SelectContent>
                  {options.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      <span dir="auto">{u.fullName}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {!reassigning && (
            <div className="space-y-2">
              <Label htmlFor="assign-notes">{t("assignWorker.notes")}</Label>
              <Textarea id="assign-notes" rows={3} value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={assign.isPending}>
              {t("assignWorker.cancel")}
            </Button>
            <Button type="submit" disabled={!workerId || assign.isPending}>
              {assign.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t(reassigning ? "assignWorker.reassign" : "assignWorker.assign")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
