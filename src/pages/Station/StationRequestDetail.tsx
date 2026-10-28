import { useState } from "react";
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
import { ChevronLeft, AlertCircle, Building2, MapPin, Phone, Calendar, XCircle, FileText, Briefcase } from "lucide-react";
import { toast } from "sonner";
import useStationRequestById from "@/hooks/Station/useStationRequestById";
import useSelectQuote from "@/hooks/Station/useSelectQuote";
import useRejectQuote from "@/hooks/Station/useRejectQuote";
import { formatDate } from "@/lib/i18n/formatters";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SourceReportAttachments from "@/components/SourceReportAttachments";
import ActivityTimeline from "@/components/ActivityTimeline";
import SendToProvidersCard from "@/components/SendToProvidersCard";
import QuoteOfferDetails from "@/components/QuoteOfferDetails";
import PaymentRecordPanel from "@/components/PaymentRecordPanel";
import PaymentProgressSummary from "@/components/flow/PaymentProgressSummary";
import FlowBreadcrumb from "@/components/flow/FlowBreadcrumb";

export default function StationRequestDetail() {
  const { t, i18n } = useTranslation("station");
  const { t: tCommon } = useTranslation("common");
  const { t: tActivity } = useTranslation("activity");
  const { t: tReport } = useTranslation("finalReport");
  const { t: tFlow } = useTranslation("flow");
  const { t: tQuoteRaw } = useTranslation("station", { keyPrefix: "quoteView" });
  const tQuote = (key: string, options?: Record<string, unknown>) => tQuoteRaw(key, options) as string;
  const { id } = useParams<{ id: string }>();
  const { data: request, isLoading } = useStationRequestById(id ?? null);
  const selectQuoteMutation = useSelectQuote();
  const rejectQuoteMutation = useRejectQuote();

  const [selectedQuoteId, setSelectedQuoteId] = useState<string>("");
  const [rejectQuoteId, setRejectQuoteId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

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
  // the payment already reported for this job (any state past "not started"), whichever job the page is showing
  const shownJob = awaitingPaymentJob ?? externalJobOrder ?? jobOrders[0];
  const recordedPayment = shownJob?.paymentRecord && ["STATION_CONFIRMED_SENT", "PROVIDER_CONFIRMED_RECEIVED"].includes(shownJob.paymentRecord.status ?? "") ? shownJob.paymentRecord : undefined;
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

      <FlowBreadcrumb side="station" current="stationRequest" rfqId={request.id} jobOrderId={shownJob?.id} />

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

          {request.sourceReport && (
            <div className="space-y-2" data-testid="request-source-report">
              <p className="text-sm font-medium">{tCommon("sourceReport.title")}</p>
              {request.sourceReport.attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tCommon("sourceReport.none")}</p>
              ) : (
                <SourceReportAttachments attachments={request.sourceReport.attachments} />
              )}
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
                      <span className="min-w-0" data-testid={`quote-summary-${q.id}`}>
                        <span className="font-medium" dir="auto">
                          {q.providerName ?? (q.providerOrganizationId != null ? tQuote("unnamed", { id: q.providerOrganizationId }) : t("requestDetail.quoteLabel", { id: q.id }))}
                        </span>
                        {q.amount != null && <span className="mx-1 inline-block font-semibold" dir="ltr">{`· ${q.amount} ${q.currency ?? ""}`.trimEnd()}</span>}
                        <span className="text-muted-foreground">{`· ${t("requestDetail.quoteLabel", { id: q.id })}`}</span>
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
                      <QuoteOfferDetails quote={q} />
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
                      <SelectTrigger className="w-[260px] max-w-full">
                        <SelectValue placeholder={t("requestDetail.chooseQuote")} />
                      </SelectTrigger>
                      <SelectContent>
                        {selectableQuotes.map((q) => (
                          <SelectItem key={q.id} value={String(q.id)}>
                            {q.providerName ?? t("requestDetail.quoteLabel", { id: q.id })}{q.amount != null ? ` · ${q.amount} ${q.currency ?? ""}`.trimEnd() : ""}
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

              {recordedPayment ? <PaymentRecordPanel record={recordedPayment} audience="station" /> : null}
              {shownJob?.id != null ? (
                <div className="space-y-3 pt-2 border-t" data-testid="request-payment-summary">
                  <PaymentProgressSummary side="station" jobOrderId={shownJob.id} jobOrderHref={`/station-job-orders/${shownJob.id}`} legacyStatus={shownJob.paymentRecord?.status} />
                  <Button asChild size="lg" className="gap-2" data-testid="open-job-order">
                    <Link to={`/station-job-orders/${shownJob.id}`}><Briefcase className="h-5 w-5" />{tFlow("openJobOrder")}</Link>
                  </Button>
                  <p className="text-xs text-muted-foreground">{tFlow("openJobOrderHint")}</p>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
      <SendToProvidersCard requestId={request.id} status={request.status} recipients={request.recipients ?? []} />
      <Button asChild variant="outline" className="w-fit">
        <Link to={`/reports/requests/${request.id}`} data-testid="open-final-report"><FileText className="me-2 h-4 w-4" />{tReport("open")}</Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{tActivity("title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{tActivity("description")}</p>
        </CardHeader>
        <CardContent>
          <ActivityTimeline root="stationRequest" id={request.id} />
        </CardContent>
      </Card>
    </div>
      )}
    </div>
  );
}
