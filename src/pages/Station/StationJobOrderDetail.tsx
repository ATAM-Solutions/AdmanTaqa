import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, CheckCircle, XCircle, FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import useStationJobOrderById from "@/hooks/Station/useStationJobOrderById";
import useStationJobOrderReports from "@/hooks/Station/useStationJobOrderReports";
import useApproveStationJobOrder from "@/hooks/Station/useApproveStationJobOrder";
import useRejectStationJobOrder from "@/hooks/Station/useRejectStationJobOrder";
import useApproveReport from "@/hooks/Station/useApproveReport";
import useRejectReport from "@/hooks/Station/useRejectReport";
import useUploadJobOrderReceipt from "@/hooks/Station/useUploadJobOrderReceipt";
import useConfirmPaymentSent from "@/hooks/Station/useConfirmPaymentSent";
import { getApiErrorMessage } from "@/lib/utils";
import { formatDate } from "@/lib/i18n/formatters";

const MAX_RECEIPT_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export default function StationJobOrderDetail() {
  const { t, i18n } = useTranslation("station");
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading } = useStationJobOrderById(id ?? null);
  const { data: reports = [] } = useStationJobOrderReports(id ?? null);
  const approveOrderMutation = useApproveStationJobOrder();
  const rejectOrderMutation = useRejectStationJobOrder();
  const approveReportMutation = useApproveReport();
  const rejectReportMutation = useRejectReport();
  const uploadReceiptMutation = useUploadJobOrderReceipt();
  const confirmSentMutation = useConfirmPaymentSent();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rejectReason, setRejectReason] = useState("");
  const [rejectReportReason, setRejectReportReason] = useState("");
  const [rejectReportId, setRejectReportId] = useState<number | null>(null);
  const [receiptFileUrl, setReceiptFileUrl] = useState<string>("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const underReview = order?.status === "UNDER_REVIEW";
  const awaitingPayment = order?.status === "AWAITING_PAYMENT";
  const paymentRejected = order?.paymentRecord?.status === "REJECTED";
  const stationAlreadyConfirmedSent = order?.paymentRecord?.status === "STATION_CONFIRMED_SENT";
  const showPaymentSection =
    awaitingPayment && !paymentRejected && !stationAlreadyConfirmedSent;
  const canApproveOrRejectOrder = underReview;

  const handleApproveOrder = () => {
    if (!id) return;
    approveOrderMutation.mutate(id, {
      onSuccess: () => toast.success(t("jobOrderDetail.toasts.approved")),
      onError: (e) => toast.error(e instanceof Error ? e.message : t("jobOrderDetail.toasts.approveFailed")),
    });
  };

  const handleRejectOrder = () => {
    if (!id || !rejectReason.trim()) {
      toast.error(t("jobOrderDetail.toasts.reworkReasonRequired"));
      return;
    }
    rejectOrderMutation.mutate(
      { jobOrderId: id, body: { reason: rejectReason.trim() } },
      {
        onSuccess: () => {
          toast.success(t("jobOrderDetail.toasts.reworkRequested"));
          setRejectReason("");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : t("jobOrderDetail.toasts.rejectFailed")),
      }
    );
  };

  const handleApproveReport = (reportId: number) => {
    approveReportMutation.mutate(reportId, {
      onSuccess: () => toast.success(t("jobOrderDetail.toasts.reportApproved")),
      onError: (e) => toast.error(e instanceof Error ? e.message : t("jobOrderDetail.toasts.reportActionFailed")),
    });
  };

  const handleRejectReport = (reportId: number) => {
    if (!rejectReportReason.trim()) {
      toast.error(t("jobOrderDetail.toasts.reportReasonRequired"));
      return;
    }
    rejectReportMutation.mutate(
      { reportId, body: { reason: rejectReportReason.trim() } },
      {
        onSuccess: () => {
          toast.success(t("jobOrderDetail.toasts.reportRejected"));
          setRejectReportId(null);
          setRejectReportReason("");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : t("jobOrderDetail.toasts.reportActionFailed")),
      }
    );
  };

  const handleUploadReceipt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    if (file.size > MAX_RECEIPT_SIZE_BYTES) {
      toast.error(t("jobOrderDetail.toasts.fileTooLarge"));
      e.target.value = "";
      return;
    }
    if (order?.paymentRecord?.status === "STATION_CONFIRMED_SENT") {
      toast.info(t("jobOrderDetail.toasts.alreadyConfirmed"));
      e.target.value = "";
      return;
    }
    uploadReceiptMutation.mutate(
      { jobOrderId: id, file },
      {
        onSuccess: (data) => {
          const url = (data as { receiptFileUrl?: string })?.receiptFileUrl;
          if (url) {
            setReceiptFileUrl(url);
            toast.success(t("jobOrderDetail.toasts.receiptUploaded"));
          } else {
            toast.success(t("jobOrderDetail.toasts.receiptUploadedGeneric"));
          }
        },
        onError: (err) => toast.error(getApiErrorMessage(err, t("jobOrderDetail.toasts.uploadFailed"))),
      }
    );
    e.target.value = "";
  };

  const handleConfirmPaymentSent = () => {
    if (!id) return;
    if (order?.paymentRecord?.status === "STATION_CONFIRMED_SENT") {
      toast.info(t("jobOrderDetail.toasts.alreadyConfirmed"));
      return;
    }
    const hasReceipt = !!(receiptFileUrl || order?.paymentRecord?.receiptFileUrl);
    const hasRef = referenceNumber.trim().length > 0;
    if (!hasReceipt && !hasRef) {
      toast.error(t("jobOrderDetail.toasts.uploadOrRefRequired"));
      return;
    }
    const body: { receiptFileUrl?: string; referenceNumber?: string; amount?: number; method?: string } = {};
    const url = receiptFileUrl || order?.paymentRecord?.receiptFileUrl;
    if (url) body.receiptFileUrl = url;
    if (referenceNumber.trim()) body.referenceNumber = referenceNumber.trim();
    const amountNum = paymentAmount.trim() ? Number(paymentAmount.trim()) : undefined;
    if (amountNum != null && !Number.isNaN(amountNum)) body.amount = amountNum;
    if (paymentMethod) body.method = paymentMethod;

    confirmSentMutation.mutate(
      { jobOrderId: id, body },
      {
        onSuccess: () => {
          toast.success(t("jobOrderDetail.toasts.paymentConfirmed"));
        },
        onError: (err) => toast.error(getApiErrorMessage(err, t("jobOrderDetail.toasts.confirmFailed"))),
      }
    );
  };

  if (isLoading || !id) {
    return (
      <div className="p-4 md:p-8 flex justify-center min-h-[200px] items-center text-muted-foreground">
        {t("loading")}
      </div>
    );
  }
  if (!order) {
    return (
      <div className="p-4 md:p-8">
        <Button variant="ghost" asChild>
          <Link to="/station-job-orders">{t("back")}</Link>
        </Button>
        <p className="text-destructive">{t("jobOrderDetail.notFound")}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <Button variant="ghost" asChild>
        <Link to="/station-job-orders" className="gap-2">
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" /> {t("back")}
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>
            {order.ExternalRequest?.formData?.title ??
              order.ServiceRequest?.formData?.title ??
              order.ServiceRequest?.formData?.description ??
              t("jobOrderDetail.jobOrderFallback", { id: order.id })}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("jobOrderDetail.statusLabel")} <Badge variant="secondary">{order.status}</Badge>
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {canApproveOrRejectOrder && (
            <div className="pt-4 border-t space-y-3">
              <p className="text-sm font-medium">{t("jobOrderDetail.reviewHeading")}</p>
              <div className="flex flex-wrap gap-2 items-end">
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={handleApproveOrder}
                  disabled={approveOrderMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4" /> {t("jobOrderDetail.approveClose")}
                </Button>
                <div className="flex gap-2 items-end">
                  <div className="space-y-1">
                    <Label htmlFor="reject-reason" className="text-xs">{t("jobOrderDetail.reworkReason")}</Label>
                    <Input
                      id="reject-reason"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder={t("jobOrderDetail.reworkReasonPlaceholder")}
                      className="w-[200px]"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1"
                    onClick={handleRejectOrder}
                    disabled={rejectOrderMutation.isPending || !rejectReason.trim()}
                  >
                    <XCircle className="h-4 w-4" /> {t("jobOrderDetail.requestRework")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {paymentRejected && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">{t("jobOrderDetail.paymentRejectedTitle")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("jobOrderDetail.paymentRejectedNote")}</p>
            {order.paymentRecord?.rejectionReason && (
              <p className="text-sm text-muted-foreground mt-1">{order.paymentRecord.rejectionReason}</p>
            )}
          </CardHeader>
        </Card>
      )}

      {awaitingPayment && stationAlreadyConfirmedSent && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="pt-4 space-y-2">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              {t("jobOrderDetail.paymentConfirmedTitle")}
            </p>
            <p className="text-xs text-muted-foreground">{t("jobOrderDetail.paymentConfirmedNote", { id })}</p>
          </CardContent>
        </Card>
      )}

      {showPaymentSection && (
        <Card>
          <CardHeader>
            <CardTitle>{t("jobOrderDetail.paymentHeading")}</CardTitle>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">{t("jobOrderDetail.paymentHint")}</p>
            <p className="text-sm text-muted-foreground">{t("jobOrderDetail.paymentSteps")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">{t("jobOrderDetail.uploadReceiptLabel")}</Label>
              <input
                type="file"
                accept=".pdf,image/*"
                ref={fileInputRef}
                onChange={handleUploadReceipt}
                className="hidden"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadReceiptMutation.isPending}
                >
                  <Upload className="h-4 w-4" /> {t("jobOrderDetail.uploadReceipt")}
                </Button>
                {(receiptFileUrl || order.paymentRecord?.receiptFileUrl) && (
                  <a
                    href={(receiptFileUrl || order.paymentRecord?.receiptFileUrl) ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary underline"
                  >
                    {t("jobOrderDetail.viewReceipt")}
                  </a>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ref-number" className="text-sm">{t("jobOrderDetail.referenceNumber")}</Label>
                <Input
                  id="ref-number"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. TRF-2024-001"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="payment-amount" className="text-sm">{t("jobOrderDetail.amount")}</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  min={0}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">{t("jobOrderDetail.method")}</Label>
                <Select value={paymentMethod || "_"} onValueChange={(v) => setPaymentMethod(v === "_" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_">—</SelectItem>
                    <SelectItem value="BANK_TRANSFER">{t("jobOrderDetail.methodBankTransfer")}</SelectItem>
                    <SelectItem value="CASH">{t("jobOrderDetail.methodCash")}</SelectItem>
                    <SelectItem value="OTHER">{t("jobOrderDetail.methodOther")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Button
                size="sm"
                className="gap-1"
                onClick={handleConfirmPaymentSent}
                disabled={
                  confirmSentMutation.isPending ||
                  (!(receiptFileUrl || order.paymentRecord?.receiptFileUrl) && !referenceNumber.trim())
                }
              >
                <CheckCircle className="h-4 w-4" /> {t("jobOrderDetail.confirmPaymentSent")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {reports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> {t("jobOrderDetail.reportsHeading")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {reports.map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <span className="font-medium">{r.title ?? t("jobOrderDetail.reportFallback", { id: r.id })}</span>
                    <Badge variant="outline" className="ms-2 text-xs">{r.status}</Badge>
                    {r.createdAt && (
                      <span className="ms-2 text-xs text-muted-foreground">
                        {formatDate(r.createdAt, i18n.language, { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApproveReport(r.id)}
                      disabled={approveReportMutation.isPending}
                    >
                      {t("jobOrderDetail.approve")}
                    </Button>
                    {rejectReportId === r.id ? (
                      <div className="flex gap-2 items-center">
                        <Input
                          value={rejectReportReason}
                          onChange={(e) => setRejectReportReason(e.target.value)}
                          placeholder={t("jobOrderDetail.reasonPlaceholder")}
                          className="w-32 h-8"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectReport(r.id)}
                          disabled={rejectReportMutation.isPending || !rejectReportReason.trim()}
                        >
                          {t("jobOrderDetail.reject")}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setRejectReportId(null)}>
                          {t("jobOrderDetail.cancel")}
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setRejectReportId(r.id)}>
                        {t("jobOrderDetail.reject")}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
