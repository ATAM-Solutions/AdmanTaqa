import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { checkinProviderVisit } from "@/api/services/providerService";
import { isValidManualReason, manualErrorKey, type ManualOperator, type ManualVisit } from "@/lib/manualCheckin";

interface Props {
  jobOrderId: number | string;
  visit: ManualVisit;
  operators: ManualOperator[];
  /** called after the check-in was recorded, so the page refetches */
  onDone: () => void;
}

interface BodyProps {
  jobOrderId: number | string;
  visit: ManualVisit;
  operators: ManualOperator[];
  operatorId: string;
  onOperatorChange: (id: string) => void;
  reason: string;
  onReasonChange: (v: string) => void;
  confirmed: boolean;
  onConfirmedChange: (v: boolean) => void;
}

/** The modal's content: who, which job and visit, why, and the explicit confirmation. Presentational (tested on its own). */
export function ManualCheckinFormBody({ jobOrderId, visit, operators, operatorId, onOperatorChange, reason, onReasonChange, confirmed, onConfirmedChange }: BodyProps) {
  const { t } = useTranslation("execution");
  const operator = operators.find((o) => String(o.id) === operatorId) ?? operators[0];
  return (
    <>
          <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm" data-testid="manual-checkin-summary">
            <dt className="text-muted-foreground">{t("manual.job")}</dt><dd dir="ltr" className="text-start">#{jobOrderId}</dd>
            <dt className="text-muted-foreground">{t("manual.visit")}</dt><dd dir="ltr" className="text-start">#{visit.id}{visit.visitDate ? ` · ${visit.visitDate}` : ""}</dd>
            <dt className="text-muted-foreground">{t("manual.operator")}</dt>
            <dd dir="auto">
              {operators.length > 1 ? (
                <select value={operatorId} onChange={(e) => onOperatorChange(e.target.value)} className="h-8 w-full rounded-md border bg-background px-2 text-sm" data-testid="manual-checkin-operator">
                  {operators.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              ) : operator?.name}
            </dd>
          </dl>
          <div className="space-y-1">
            <Label htmlFor="manual-reason">{t("manual.reason")}</Label>
            <Textarea id="manual-reason" dir="auto" value={reason} onChange={(e) => onReasonChange(e.target.value)} maxLength={2000} placeholder={t("manual.reasonPlaceholder")} data-testid="manual-checkin-reason" />
            {reason.length > 0 && !isValidManualReason(reason) ? <p className="text-xs text-destructive" role="alert" data-testid="manual-reason-hint">{t("manual.reasonRequired")}</p> : null}
          </div>
          <div className="flex items-start gap-2">
            <Checkbox id="manual-confirm" checked={confirmed} onCheckedChange={(v) => onConfirmedChange(v === true)} data-testid="manual-checkin-confirm" />
            <Label htmlFor="manual-confirm" className="text-sm font-normal leading-snug">{t("manual.confirm", { name: operator?.name ?? "" })}</Label>
          </div>
          <p className="text-xs text-muted-foreground">{t("manual.notice")}</p>
    </>
  );
}

/**
 * The Provider Manager's separate "Manual Check-in" action: confirm, under their own name, that the ASSIGNED operator is on site
 * when the operator could not check in with GPS. It shows the job, the operator and the visit, needs a reason and an explicit
 * confirmation, and sends the job and operator ids so the server can verify them. It never sends coordinates.
 */
export default function ManualCheckinOnBehalf({ jobOrderId, visit, operators, onDone }: Props) {
  const { t } = useTranslation("execution");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [operatorId, setOperatorId] = useState(String(operators[0]?.id ?? ""));
  const operator = operators.find((o) => String(o.id) === operatorId) ?? operators[0];

  const reset = () => { setReason(""); setConfirmed(false); };
  const save = useMutation({
    mutationFn: () => checkinProviderVisit(visit.id, { method: "MANUAL", reason: reason.trim(), onBehalfOfOperatorId: operator.id, jobOrderId: Number(jobOrderId) }),
    onSuccess: () => { toast.success(t("manual.success", { name: operator.name })); setOpen(false); reset(); onDone(); },
    onError: (e) => { toast.error(t(`manual.errors.${manualErrorKey(e)}`)); onDone(); },
  });
  const canConfirm = !!operator && isValidManualReason(reason) && confirmed && !save.isPending;

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => { reset(); setOpen(true); }} data-testid="manual-checkin-open">
        <UserCheck className="me-1 h-4 w-4" aria-hidden />{t("manual.button")}
      </Button>
      <Dialog open={open} onOpenChange={(o) => { if (!save.isPending) setOpen(o); }}>
        <DialogContent data-testid="manual-checkin-dialog">
          <DialogHeader>
            <DialogTitle>{t("manual.title")}</DialogTitle>
            <DialogDescription>{t("manual.description")}</DialogDescription>
          </DialogHeader>
          <ManualCheckinFormBody
            jobOrderId={jobOrderId} visit={visit} operators={operators} operatorId={operatorId} onOperatorChange={setOperatorId}
            reason={reason} onReasonChange={setReason} confirmed={confirmed} onConfirmedChange={setConfirmed}
          />
          <DialogFooter>
            <Button variant="outline" disabled={save.isPending} onClick={() => setOpen(false)}>{t("manual.cancel")}</Button>
            <Button disabled={!canConfirm} onClick={() => save.mutate()} data-testid="manual-checkin-submit">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("manual.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
