import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/i18n/formatters";
import type { Inspection } from "@/types/inspection";

type ViewInspectionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspection: Inspection | null;
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

export default function ViewInspectionDialog({ open, onOpenChange, inspection }: ViewInspectionDialogProps) {
  const { t, i18n } = useTranslation("inspections");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t("viewDialog.title", { id: inspection?.id })}</DialogTitle>
          <DialogDescription>{t("viewDialog.description")}</DialogDescription>
        </DialogHeader>
        {inspection && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <Field
                label={t("createDialog.targetOrganization")}
                value={inspection.TargetOrganization?.name ?? t("table.unknownTarget")}
              />
              <Field
                label={t("createDialog.targetType")}
                value={<Badge variant="outline">{t(`targetType.${inspection.targetType}`)}</Badge>}
              />
              {inspection.Branch && (
                <Field label={t("createDialog.branch")} value={inspection.Branch.nameEn ?? inspection.Branch.nameAr} />
              )}
              <Field
                label={t("createDialog.assignedInspector")}
                value={inspection.Inspector?.fullName ?? t("table.unknownInspector")}
              />
              <Field
                label={t("table.columns.date")}
                value={formatDate(inspection.createdAt, i18n.language)}
              />
            </div>
            <Field
              label={t("createDialog.findings")}
              value={
                inspection.findings?.notes ? (
                  <p className="whitespace-pre-wrap">{inspection.findings.notes}</p>
                ) : (
                  <span className="text-muted-foreground">{t("viewDialog.noFindings")}</span>
                )
              }
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
