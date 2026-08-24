import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, AlertCircle, Building2, MapPin, Phone, Calendar, XCircle, Upload, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import useStationRequestById from "@/hooks/Station/useStationRequestById";
import useSelectQuote from "@/hooks/Station/useSelectQuote";
import useRejectQuote from "@/hooks/Station/useRejectQuote";
import useConfirmPaymentSent from "@/hooks/Station/useConfirmPaymentSent";
import useUploadJobOrderReceipt from "@/hooks/Station/useUploadJobOrderReceipt";
import { getApiErrorMessage } from "@/lib/utils";
import { formatDate } from "@/lib/i18n/formatters";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MAX_RECEIPT_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export default function StationRequestDetail() {
  const { t, i18n } = useTranslation("station");
  const { id } = useParams<{ id: string }>();
  const { data: request, isLoading, refetch: refetchRequest } = useStationRequestById(id ?? null);
  const selectQuoteMutation = useSelectQuote();
  const rejectQuoteMutation = useRejectQuote();
  const confirmSentMutation = useConfirmPaymentSent();
  const uploadReceiptMutation = useUploadJobOrderReceipt();

  const [selectedQuoteId, setSelectedQuoteId] = useState<string>("");
  const receiptFileInputRef = useRef<HTMLInputElement>(null);
  const [rejectQuoteId, setRejectQuoteId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [receiptFileUrl, setReceiptFileUrl] = useState<string>("");
  const [paymentReferenceNumber, setPaymentReferenceNumber] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  const isCancelled = request?.status === "CANCELLED";
  const quotes = request?.quotes ?? [];
  const selectableQuotes = quotes.filter(
    (q) => q.status !== "REJECTED" && q.status !== "WITHDRAWN"
  );
  const jobOrders = request?.jobOrders ?? [];
  const externalJobOrder = request?.ExternalJobOrder;
  const paymentRejected =
    jobOrders.some((jo) => jo.paymentRecord?.status === "REJECTED") ||
    externalJobOrder?.paymentRecord?.status === "REJECTED";
  const rejectionReason =
    jobOrders.find((jo) => jo.paymentRecord?.status === "REJECTED")?.paymentRecord?.rejectionReason ??
    externalJobOrder?.paymentRecord?.rejectionReason;
  const awaitingPaymentJob =
    jobOrders.find((jo) => jo.status === "AWAITING_PAYMENT") ??
    (externalJobOrder?.status === "AWAITING_PAYMENT" ? externalJobOrder : undefined);
  const stationAlreadyConfirmedSent =
    awaitingPaymentJob?.paymentRecord?.status === "STATION_CONFIRMED_SENT";

  const handleSelectQuote = () => {
    if (!id || !selectedQuoteId) {
      toast.error(t("requestDetail.toasts.selectQuoteRequired"));
      return;
    }
    selectQuoteMutation.mutate(
      { requestId: id, providerQuoteId: Number(selectedQuoteId) },
      {
        onSuccess: () => toast.success(t("requestDetail.toasts.quoteSelected")),
        onError: (e) => toast.error(e instanceof Error ? e.message : t("requestDetail.toasts.selectQuoteFailed")),
      }
    );
  };

  const handleConfirmPaymentSent = () => {
    if (!awaitingPaymentJob?.id) return;
    if (awaitingPaymentJob.paymentRecord?.status === "STATION_CONFIRMED_SENT") {
      toast.info(t("requestDetail.toasts.alreadyConfirmed"));
      return;
    }
    const hasReceipt = !!(receiptFileUrl || awaitingPaymentJob.paymentRecord?.receiptFileUrl);
    const hasRef = paymentReferenceNumber.trim().length > 0;
    if (!hasReceipt && !hasRef) {
      toast.error(t("requestDetail.toasts.uploadOrRefRequired"));
      return;
    }
    const body: { receiptFileUrl?: string; referenceNumber?: string; amount?: number; method?: string } = {};
    const url = receiptFileUrl || awaitingPaymentJob.paymentRecord?.receiptFileUrl;
    if (url) body.receiptFileUrl = url;
    if (paymentReferenceNumber.trim()) body.referenceNumber = paymentReferenceNumber.trim();
    const amountNum = paymentAmount.trim() ? Number(paymentAmount.trim()) : undefined;
    if (amountNum != null && !Number.isNaN(amountNum)) body.amount = amountNum;
    if (paymentMethod) body.method = paymentMethod;

    confirmSentMutation.mutate(
      { jobOrderId: awaitingPaymentJob.id, body },
      {
        onSuccess: () => {
          refetchRequest();
          toast.success(t("requestDetail.toasts.paymentConfirmed"), { duration: 8000 });
        },
        onError: (e) => toast.error(getApiErrorMessage(e, t("requestDetail.toasts.confirmFailed"))),
      }
    );
  };

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!awaitingPaymentJob?.id || !file) return;
    if (file.size > MAX_RECEIPT_SIZE_BYTES) {
      toast.error(t("requestDetail.toasts.fileTooLarge"));
      e.target.value = "";
      return;
    }
    if (awaitingPaymentJob.paymentRecord?.status === "STATION_CONFIRMED_SENT") {
      toast.info(t("requestDetail.toasts.alreadyConfirmed"));
      e.target.value = "";
      return;
    }
    uploadReceiptMutation.mutate(
      { jobOrderId: awaitingPaymentJob.id, file },
      {
        onSuccess: (data) => {
          if (data?.receiptFileUrl) {
            setReceiptFileUrl(data.receiptFileUrl);
            toast.success(t("requestDetail.toasts.receiptUploaded"));
          } else {
            toast.success(t("requestDetail.toasts.receiptUploadedGeneric"));
          }
          e.target.value = "";
        },
        onError: (err) => toast.error(getApiErrorMessage(err, t("requestDetail.toasts.uploadFailed"))),
      }
    );
  };

  const handleRejectQuote = () => {
    if (!id || rejectQuoteId == null || !rejectReason.trim()) {
      toast.error(t("requestDetail.toasts.reasonRequired"));
      return;
    }
    rejectQuoteMutation.mutate(
      { requestId: id, providerQuoteId: rejectQuoteId, rejectionReason: rejectReason.trim() },
      {
        onSuccess: () => {
          toast.success(t("requestDetail.toasts.quoteRejected"));
          setRejectQuoteId(null);
          setRejectReason("");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : t("requestDetail.toasts.rejectFailed")),
      }
    );
  };

  return (
    <div className="p-4 md:p-8">
      {isLoading || !id ? (
        <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
          {t("loading")}
        </div>
      ) : !request ? (
        <>
          <Button variant="ghost" asChild>
            <Link to="/station-requests">{t("back")}</Link>
          </Button>
          <p className="text-destructive">{t("requestDetail.notFound")}</p>
        </>
      ) : (
    <div className="space-y-6">
      <Button variant="ghost" asChild>
        <Link to="/station-requests" className="gap-2">
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" /> {t("back")}
        </Link>
      </Button>

      {isCancelled && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="pt-4">
            <p className="font-medium text-amber-800 dark:text-amber-200">{t("requestDetail.cancelledTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("requestDetail.cancelledNote")}</p>
            {request.cancellationReason && (
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{request.cancellationReason}</p>
            )}
          </CardContent>
        </Card>
      )}

      {paymentRejected && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="font-medium text-destructive">{t("requestDetail.paymentRejectedTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("requestDetail.paymentRejectedNote")}</p>
              {rejectionReason && (
                <p className="text-sm text-muted-foreground mt-1">{rejectionReason}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{request.title ?? request.formData?.description ?? t("requestDetail.requestFallback", { id: request.id })}</CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
            <Badge variant="secondary">{request.status}</Badge>
            {request.formData?.priority && (
              <span className="capitalize">{t("requestDetail.priorityLabel", { priority: request.formData.priority })}</span>
            )}
            {request.createdAt && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(request.createdAt, i18n.language, { dateStyle: "medium", timeStyle: "short" })}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(request.description ?? request.formData?.description) && (
            <p className="text-sm">{request.description ?? (request.formData?.description as string)}</p>
          )}

          {request.Branch && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("requestDetail.branchLabel")}</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  {request.Branch.nameEn ?? request.Branch.nameAr ?? `Branch #${request.Branch.id}`}
                </span>
                {request.Branch.address && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {request.Branch.address}
                    {request.Branch.street && ` · ${request.Branch.street}`}
                  </span>
                )}
                {request.Branch.managerName && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    {request.Branch.managerName}
                    {request.Branch.managerPhone && (
                      <span dir="ltr">{` · ${request.Branch.managerPhone}`}</span>
                    )}
                  </span>
                )}
              </div>
            </div>
          )}

          {quotes.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("requestDetail.quotesHeading")}</p>
              <ul className="space-y-2">
                {quotes.map((q) => {
                  const isRejected = q.status === "REJECTED";
                  const isWithdrawn = q.status === "WITHDRAWN";
                  const isInactive = isRejected || isWithdrawn;
                  const showRejectForm = !isCancelled && !isInactive && rejectQuoteId === q.id;
                  return (
                    <li
                      key={q.id}
                      className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm ${
                        isInactive ? "opacity-75 bg-muted/50 border-muted" : ""
                      }`}
                    >
                      <span>
                        {t("requestDetail.quoteLabel", { id: q.id })}
                        {q.amount != null && ` · ${q.amount}`}
                        {q.providerOrganizationId != null && ` · ${t("requestDetail.orgLabel", { id: q.providerOrganizationId })}`}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {!isInactive && rejectQuoteId !== q.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive gap-1"
                            onClick={() => setRejectQuoteId(q.id)}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            {t("requestDetail.reject")}
                          </Button>
                        )}
                        {showRejectForm && (
                          <div className="flex flex-wrap items-end gap-2">
                            <div className="space-y-1 min-w-[180px]">
                              <Label htmlFor={`reject-reason-${q.id}`} className="text-xs">
                                {t("requestDetail.reasonRequired")}
                              </Label>
                              <Input
                                id={`reject-reason-${q.id}`}
                                placeholder={t("requestDetail.reasonPlaceholder")}
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="h-8"
                              />
                            </div>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={handleRejectQuote}
                              disabled={rejectQuoteMutation.isPending || !rejectReason.trim()}
                            >
                              {t("requestDetail.submitReject")}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setRejectQuoteId(null);
                                setRejectReason("");
                              }}
                            >
                              {t("requestDetail.cancel")}
                            </Button>
                          </div>
                        )}
                        <Badge
                          variant={isRejected ? "destructive" : isWithdrawn ? "secondary" : "default"}
                          className="shrink-0"
                        >
                          {q.status ?? "—"}
                        </Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {quotes.some((q) => q.status === "REJECTED" || q.status === "WITHDRAWN") && (
                <p className="text-xs text-muted-foreground">{t("requestDetail.inactiveQuoteNote")}</p>
              )}
            </div>
          )}

          {!isCancelled && (
            <>
              {selectableQuotes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t("requestDetail.selectQuoteHeading")}</p>
                  <div className="flex gap-2 items-center">
                    <Select value={selectedQuoteId} onValueChange={setSelectedQuoteId}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder={t("requestDetail.chooseQuote")} />
                      </SelectTrigger>
                      <SelectContent>
                        {selectableQuotes.map((q) => (
                          <SelectItem key={q.id} value={String(q.id)}>
                            {t("requestDetail.quoteLabel", { id: q.id })} · {q.amount != null ? `${q.amount}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={handleSelectQuote}
                      disabled={selectQuoteMutation.isPending || !selectedQuoteId}
                    >
                      {t("requestDetail.select")}
                    </Button>
                  </div>
                </div>
              )}

              {awaitingPaymentJob && !paymentRejected && stationAlreadyConfirmedSent && (
                <div className="pt-2 border-t space-y-2 rounded-lg border bg-green-50/50 dark:bg-green-950/20 p-3">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    {t("requestDetail.paymentConfirmedTitle")}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("requestDetail.paymentConfirmedNote")}</p>
                  {(receiptFileUrl || awaitingPaymentJob.paymentRecord?.receiptFileUrl) && (
                    <a
                      href={(receiptFileUrl || awaitingPaymentJob.paymentRecord?.receiptFileUrl) ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary underline"
                    >
                      {t("requestDetail.viewReceipt")}
                    </a>
                  )}
                </div>
              )}
              {awaitingPaymentJob && !paymentRejected && !stationAlreadyConfirmedSent && (
                <div className="pt-2 border-t space-y-3">
                  <p className="text-sm font-medium">{t("requestDetail.paymentHeading")}</p>
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400">{t("requestDetail.paymentHint")}</p>
                  <p className="text-xs text-muted-foreground">{t("requestDetail.paymentSteps")}</p>
                  <div className="space-y-2">
                    <Label className="text-xs">{t("requestDetail.uploadReceiptLabel")}</Label>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={receiptFileInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={handleReceiptFileChange}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => receiptFileInputRef.current?.click()}
                        disabled={uploadReceiptMutation.isPending}
                      >
                        <Upload className="h-4 w-4" /> {t("requestDetail.uploadReceipt")}
                      </Button>
                      {(receiptFileUrl || awaitingPaymentJob.paymentRecord?.receiptFileUrl) && (
                        <a
                          href={(receiptFileUrl || awaitingPaymentJob.paymentRecord?.receiptFileUrl) ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-primary underline"
                        >
                          {t("requestDetail.viewReceiptShort")}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">{t("requestDetail.referenceNumber")}</Label>
                      <Input
                        value={paymentReferenceNumber}
                        onChange={(e) => setPaymentReferenceNumber(e.target.value)}
                        placeholder="e.g. TRF-2024-001"
                        className="h-8"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("requestDetail.amount")}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="0"
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("requestDetail.method")}</Label>
                      <Select value={paymentMethod || "_"} onValueChange={(v) => setPaymentMethod(v === "_" ? "" : v)}>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_">—</SelectItem>
                          <SelectItem value="BANK_TRANSFER">{t("requestDetail.methodBankTransfer")}</SelectItem>
                          <SelectItem value="CASH">{t("requestDetail.methodCash")}</SelectItem>
                          <SelectItem value="OTHER">{t("requestDetail.methodOther")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="gap-1"
                    onClick={handleConfirmPaymentSent}
                    disabled={
                      confirmSentMutation.isPending ||
                      (!(receiptFileUrl || awaitingPaymentJob.paymentRecord?.receiptFileUrl) && !paymentReferenceNumber.trim())
                    }
                  >
                    <CheckCircle className="h-4 w-4" /> {t("requestDetail.confirmPaymentSent")}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
      )}
    </div>
  );
}
