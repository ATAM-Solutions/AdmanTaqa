import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUpdateAdminOrganization } from "@/hooks/AdminOrganizations/useAdminOrganizations";
import { getOrganizationDisplayName } from "@/lib/company";
import { getApiErrorMessage } from "@/lib/utils";
import type { AdminOrganizationDetail } from "@/types/adminOrganization";
import { CompanyForm, type CompanyFormValues } from "../CompanyForm";
import { detailToFormValues, toUpdateBody } from "../companyForm.helpers";

const FORM_ID = "edit-company-form";

interface EditCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: AdminOrganizationDetail;
}

/** Edit company details (type is locked after creation). */
export function EditCompanyDialog({ open, onOpenChange, organization }: EditCompanyDialogProps) {
  const { t, i18n } = useTranslation("adminOrganizations");
  const mutation = useUpdateAdminOrganization();

  const handleSubmit = (values: CompanyFormValues) => {
    mutation.mutate(
      { id: organization.id, body: toUpdateBody(values) },
      {
        onSuccess: () => {
          toast.success(t("toasts.companyUpdated"));
          onOpenChange(false);
        },
        onError: (e) => toast.error(getApiErrorMessage(e, t("toasts.error"))),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!mutation.isPending ? onOpenChange(next) : undefined)}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("actions.editCompany")}</DialogTitle>
          <DialogDescription dir="auto">{getOrganizationDisplayName(organization, i18n.language)}</DialogDescription>
        </DialogHeader>

        <CompanyForm
          key={`${organization.id}-${organization.updatedAt}`}
          mode="edit"
          lockType
          defaultValues={detailToFormValues(organization)}
          formId={FORM_ID}
          hideActions
          isSubmitting={mutation.isPending}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            {t("actions.cancel")}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={mutation.isPending} className="gap-2">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mutation.isPending ? t("actions.saving") : t("actions.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
