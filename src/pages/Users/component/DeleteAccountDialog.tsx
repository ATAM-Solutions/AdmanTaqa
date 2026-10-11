import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useDeleteAccount, { DeleteAccountError } from "@/hooks/Users/useDeleteAccount";

type DeleteAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
};

export default function DeleteAccountDialog({
  open,
  onOpenChange,
  userId,
}: DeleteAccountDialogProps) {
  const { t } = useTranslation("users");
  const [password, setPassword] = useState("");
  const deleteAccountMutation = useDeleteAccount();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      toast.error(t("deleteAccountDialog.passwordRequired"));
      return;
    }
    deleteAccountMutation.mutate(
      { userId, password },
      {
        onSuccess: () => {
          toast.success(t("deleteAccountDialog.success"));
          onOpenChange(false);
        },
        onError: (e) => {
          const err = e as DeleteAccountError;
          // Translated from the stable status/code, never from English server text.
          const key =
            err.code === "ACCOUNT_DELETE_NOT_ALLOWED" || err.code === "ACCOUNT_DELETE_OTHER_NOT_ALLOWED"
              ? "errors.notAllowed"
              : err.code === "LAST_COMPANY_ADMIN"
                ? "errors.lastAdmin"
                : err.code === "PROTECTED_ACCOUNT"
                  ? "errors.protectedAccount"
                  : err.status === 400
                    ? "errors.wrongPassword"
                    : err.status && err.status >= 500
                      ? "errors.server"
                      : err.status === undefined
                        ? "errors.network"
                        : null;
          toast.error(key ? t(`deleteAccountDialog.${key}`) : t("deleteAccountDialog.error"));
        },
      }
    );
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) setPassword("");
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("deleteAccountDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("deleteAccountDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="delete-account-password">{t("deleteAccountDialog.passwordLabel")}</Label>
            <Input
              id="delete-account-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t("deleteAccountDialog.cancel")}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={deleteAccountMutation.isPending || !password.trim()}
            >
              {deleteAccountMutation.isPending ? t("deleteAccountDialog.submitting") : t("deleteAccountDialog.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
