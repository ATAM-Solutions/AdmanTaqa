import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useCreateInternalTask from "@/hooks/WorkOrders/useCreateInternalTask";
import useGetUsers from "@/hooks/Users/useGetUsers";
import { Input } from "@/components/ui/input";

type Props = {
  workOrderId: number | string;
};

export default function AssignTaskDialog({ workOrderId }: Props) {
  const { t } = useTranslation("workOrders");
  const createTaskMutation = useCreateInternalTask();
  const { data: usersResponse, isLoading: usersLoading } = useGetUsers();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");
  const users = usersResponse?.data ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTaskMutation.mutate(
      {
        workOrderId,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        assignedUserId: assignedUserId ? Number(assignedUserId) : undefined,
      },
      {
        onSuccess: () => {
          toast.success(t("assignTaskDialog.toasts.assigned"));
          setOpen(false);
          setTitle("");
          setDescription("");
          setAssignedUserId("");
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : t("assignTaskDialog.toasts.assignFailed"));
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{t("assignTaskDialog.trigger")}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t("assignTaskDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("assignTaskDialog.description", { id: workOrderId })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">{t("assignTaskDialog.titleLabel")}</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("assignTaskDialog.titlePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-description">{t("assignTaskDialog.descriptionLabel")}</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("assignTaskDialog.assignedUser")}</Label>
            <Select
              value={assignedUserId || "none"}
              onValueChange={(value) => setAssignedUserId(value === "none" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={usersLoading ? t("assignTaskDialog.loadingUsers") : t("assignTaskDialog.selectUserOptional")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("assignTaskDialog.none")}</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={String(user.id)}>
                    {user.fullName} (#{user.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("assignTaskDialog.cancel")}
            </Button>
            <Button type="submit" disabled={createTaskMutation.isPending}>
              {createTaskMutation.isPending ? t("assignTaskDialog.assigning") : t("assignTaskDialog.assign")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
