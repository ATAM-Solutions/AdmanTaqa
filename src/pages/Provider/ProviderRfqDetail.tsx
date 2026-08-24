import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, Building2, MapPin, Calendar, Hash, Briefcase, CreditCard, Info } from "lucide-react";
import useProviderRfqById from "@/hooks/Provider/useProviderRfqById";
import { getQuotePaymentTerms } from "@/types/provider";
import { formatDate as formatDateShared } from "@/lib/i18n/formatters";
import { AsyncBoundary } from "@/components/patterns/AsyncBoundary";

/** Resolve pricing details from quote: either pricingDetails (flattened API) or latest ProviderQuoteRevision.pricingJson. */
function getQuotePricingDetails(q: {
  pricingDetails?: Record<string, unknown>;
  ProviderQuoteRevisions?: Array<{ pricingJson?: Record<string, unknown> }>;
}): Record<string, unknown> | undefined {
  if (q.pricingDetails && Object.keys(q.pricingDetails).length > 0) return q.pricingDetails;
  const revisions = q.ProviderQuoteRevisions;
  if (Array.isArray(revisions) && revisions.length > 0) {
    const latest = revisions.slice().sort((a, b) => ((b as { version?: number }).version ?? 0) - ((a as { version?: number }).version ?? 0))[0];
    if (latest?.pricingJson && Object.keys(latest.pricingJson).length > 0) return latest.pricingJson;
  }
  return undefined;
}

export default function ProviderRfqDetail() {
  const { t, i18n } = useTranslation("provider");
  const { id } = useParams<{ id: string }>();
  const { data: rfq, isLoading } = useProviderRfqById(id ?? null);

  const formatDate = (s: string | undefined): string => {
    if (!s) return "—";
    return formatDateShared(s, i18n.language, { dateStyle: "medium", timeStyle: "short" });
  };

  const paymentTriggerLabel = (trigger: string | undefined): string => {
    if (!trigger) return "—";
    return t(`rfqDetail.paymentTriggers.${trigger}`, { defaultValue: trigger });
  };

  const quotes = rfq?.quotes ?? rfq?.ProviderQuotes ?? [];
  const selectedQuote = quotes.find((q: { status?: string }) => q.status === "SELECTED");
  const externalJobOrder = selectedQuote?.ExternalJobOrder ?? (selectedQuote as { ExternalJobOrder?: { id?: number; PaymentRecord?: { status?: string; receiptFileUrl?: string | null } } | null })?.ExternalJobOrder ?? null;

  const title = rfq?.formData?.title ?? rfq?.title ?? (rfq ? `RFQ #${rfq.id}` : "");
  const description = rfq?.formData?.description ?? rfq?.description;
  const priority = rfq?.formData?.priority;

  const paymentRecord = (externalJobOrder as { PaymentRecord?: { status?: string; receiptFileUrl?: string | null } } | null)?.PaymentRecord;
  const receiptFileUrl = paymentRecord?.receiptFileUrl ?? undefined;

  const branch = rfq?.Branch ?? (rfq as { branch?: { id?: number; nameEn?: string; nameAr?: string; address?: string; street?: string; latitude?: string; longitude?: string } })?.branch;
  const org = rfq?.Organization ?? (rfq as { organization?: { id?: number; name?: string } })?.organization;
  const area = rfq?.Area ?? (rfq as { area?: { id?: number; name?: string } })?.area;
  const city = rfq?.City ?? (rfq as { city?: { id?: number; name?: string } })?.city;

  return (
    <div className="p-4 md:p-8">
      <AsyncBoundary
        isLoading={isLoading || !id}
        isEmpty={!rfq}
        loadingFallback={
          <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
            {t("rfqDetail.loading")}
          </div>
        }
        emptyFallback={
          <>
            <Button variant="ghost" asChild>
              <Link to="/provider-rfqs">{t("rfqDetail.back")}</Link>
            </Button>
            <p className="text-destructive">{t("rfqDetail.notFound")}</p>
          </>
        }
      >
        {rfq && (
        <div className="space-y-6">
          <Button variant="ghost" asChild>
            <Link to="/provider-rfqs" className="gap-2">
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" /> {t("rfqDetail.back")}
            </Link>
          </Button>

          {branch && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" />
                  {t("rfqDetail.branch")}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p className="font-medium">{branch.nameEn ?? branch.nameAr ?? (branch.id != null ? t("rfqDetail.branchFallback", { id: branch.id }) : "—")}</p>
                {branch.address && (
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {branch.address}
                    {branch.street && `, ${branch.street}`}
                  </p>
                )}
                {(branch.latitude || branch.longitude) && (
                  <p className="text-muted-foreground text-xs" dir="ltr">
                    {[branch.latitude, branch.longitude].filter(Boolean).join(", ")}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {(org || area || city) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("rfqDetail.orgAndLocation")}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {org && <p><span className="text-muted-foreground">{t("rfqDetail.organization")}</span> {org.name ?? (org.id != null ? `#${org.id}` : "—")}</p>}
                {area && <p><span className="text-muted-foreground">{t("rfqDetail.area")}</span> {area.name ?? (area.id != null ? `#${area.id}` : "—")}</p>}
                {city && <p><span className="text-muted-foreground">{t("rfqDetail.city")}</span> {city.name ?? (city.id != null ? `#${city.id}` : "—")}</p>}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-muted-foreground" />
                {title}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="secondary">{rfq.status ?? "—"}</Badge>
                {priority && <span className="text-muted-foreground">{t("rfqDetail.priority", { priority })}</span>}
                <span className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {t("rfqDetail.created", { date: formatDate(rfq.createdAt) })}
                </span>
                {rfq.updatedAt && rfq.updatedAt !== rfq.createdAt && (
                  <span className="text-muted-foreground">{t("rfqDetail.updated", { date: formatDate(rfq.updatedAt) })}</span>
                )}
              </div>
            </CardHeader>
            {externalJobOrder?.id != null && (
              <div className="ms-6 pt-2 pb-2 border-b">
                <Button size="sm" variant="outline" className="gap-2" asChild>
                  <Link to={`/provider-job-orders/${externalJobOrder.id}`}>
                    <Briefcase className="h-4 w-4" />
                    {t("rfqDetail.jobOrder")}
                  </Link>
                </Button>
              </div>
            )}
            {receiptFileUrl && (
              <div className="ms-6 pt-2 pb-2 border-b space-y-2">
                <p className="text-sm font-medium">{t("rfqDetail.paymentReceipt")}</p>
                <a
                  href={receiptFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-lg border overflow-hidden bg-muted/30 max-w-[280px]"
                >
                  <img
                    src={receiptFileUrl}
                    alt={t("rfqDetail.paymentReceipt")}
                    className="w-full h-auto object-contain max-h-64"
                  />
                </a>
                <p className="text-xs text-muted-foreground">
                  <a href={receiptFileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {t("rfqDetail.openReceiptNewTab")}
                  </a>
                </p>
              </div>
            )}
            <CardContent className="space-y-4">
              {description && rfq.status !== "AWAITING_PAYMENT" && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("rfqDetail.description")}</p>
                  <p className="text-sm mt-1">{description}</p>
                </div>
              )}

              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">{t("rfqDetail.yourQuotes")}</p>
                {quotes.length === 0 ? (
                  <div className="rounded border border-muted/50 px-3 py-4 text-sm text-muted-foreground space-y-4">
                    <p>{t("rfqDetail.noQuotesYet")}</p>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                          <CreditCard className="h-3.5 w-3.5" />
                          {t("rfqDetail.pricingDetails")}
                        </p>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                          <><dt className="text-muted-foreground">{t("rfqDetail.fields.amount")}</dt><dd>—</dd></>
                          <><dt className="text-muted-foreground">{t("rfqDetail.fields.laborCost")}</dt><dd>—</dd></>
                          <><dt className="text-muted-foreground">{t("rfqDetail.fields.materialCost")}</dt><dd>—</dd></>
                          <><dt className="text-muted-foreground">{t("rfqDetail.fields.timeline")}</dt><dd>—</dd></>
                          <><dt className="text-muted-foreground">{t("rfqDetail.fields.warranty")}</dt><dd>—</dd></>
                          <><dt className="text-muted-foreground">{t("rfqDetail.fields.scopeOfWork")}</dt><dd>—</dd></>
                          <><dt className="text-muted-foreground">{t("rfqDetail.fields.technicalProposal")}</dt><dd>—</dd></>
                          <><dt className="text-muted-foreground sm:col-span-1">{t("rfqDetail.fields.notes")}</dt><dd className="sm:col-span-1">—</dd></>
                        </dl>
                      </div>
                      <div>
                        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
                          <CreditCard className="h-3.5 w-3.5" />
                          {t("rfqDetail.paymentTermsInstallments")}
                        </p>
                        <Table>
                          <TableHeader>
                            <TableRow className="border-muted/50 hover:bg-transparent">
                              <TableHead className="text-xs font-medium">{t("rfqDetail.table.sequence")}</TableHead>
                              <TableHead className="text-xs font-medium">{t("rfqDetail.table.percent")}</TableHead>
                              <TableHead className="text-xs font-medium">{t("rfqDetail.table.whenDue")}</TableHead>
                              <TableHead className="text-xs font-medium">{t("rfqDetail.table.attachments")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow className="border-muted/50">
                              <TableCell colSpan={4} className="text-xs py-3 text-center text-muted-foreground">
                                {t("rfqDetail.noPaymentTerms")}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {quotes.map((q: {
                          id: number;
                          status?: string;
                          amount?: number;
                          validUntil?: string;
                          paymentType?: string;
                          pricingDetails?: {
                            amount?: number;
                            currency?: string;
                            notes?: string;
                            timeline?: string;
                            warranty?: string;
                            laborCost?: number;
                            scopeOfWork?: string;
                            materialCost?: number;
                            technicalProposal?: string;
                            [key: string]: unknown;
                          };
                        }) => {
                          const quotePaymentTerms = getQuotePaymentTerms(q as Parameters<typeof getQuotePaymentTerms>[0]);
                          const paymentType = q.paymentType ?? (quotePaymentTerms.length > 0 ? "INSTALLMENTS" : undefined);
                          const pd = getQuotePricingDetails(q as Parameters<typeof getQuotePricingDetails>[0]);
                          const amount = (pd?.amount as number | undefined) ?? q.pricingDetails?.amount ?? q.amount;
                          const currency = (pd?.currency as string | undefined) ?? q.pricingDetails?.currency;
                          return (
                            <li
                              key={q.id}
                              className="flex flex-col gap-2 rounded border px-3 py-2 text-sm"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span>
                                  #{q.id}
                                  {amount != null ? ` · ${amount}${currency ? ` ${currency}` : ""}` : ""}
                                  {q.validUntil ? ` · ${t("rfqDetail.validUntil", { date: String(q.validUntil).slice(0, 10) })}` : ""}
                                  {paymentType ? ` · ${paymentType.replace(/_/g, " ")}` : ""}
                                </span>
                                <div className="flex items-center gap-2">
                                  {q.status === "REJECTED" && <Badge variant="destructive">{t("rfqDetail.status.rejected")}</Badge>}
                                  {q.status === "WITHDRAWN" && <Badge variant="secondary">{t("rfqDetail.status.withdrawn")}</Badge>}
                                  {q.status === "ACCEPTED" && <Badge variant="default">{t("rfqDetail.status.accepted")}</Badge>}
                                  {q.status === "SELECTED" && <Badge variant="default">{t("rfqDetail.status.selected")}</Badge>}
                                </div>
                              </div>

                              <div className="mt-2 pt-2 border-t border-muted/50 space-y-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                  <CreditCard className="h-3.5 w-3.5" />
                                  {t("rfqDetail.pricingDetails")}
                                </p>
                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                                  <><dt className="text-muted-foreground">{t("rfqDetail.fields.amount")}</dt><dd>{pd?.amount != null ? `${String(pd.amount)}${pd.currency ? ` ${String(pd.currency)}` : ""}` : "—"}</dd></>
                                  <><dt className="text-muted-foreground">{t("rfqDetail.fields.laborCost")}</dt><dd>{pd?.laborCost != null ? `${String(pd.laborCost)}${pd.currency ? ` ${String(pd.currency)}` : ""}` : "—"}</dd></>
                                  <><dt className="text-muted-foreground">{t("rfqDetail.fields.materialCost")}</dt><dd>{pd?.materialCost != null ? `${String(pd.materialCost)}${pd.currency ? ` ${String(pd.currency)}` : ""}` : "—"}</dd></>
                                  <><dt className="text-muted-foreground">{t("rfqDetail.fields.timeline")}</dt><dd>{pd?.timeline != null && pd.timeline !== "" ? String(pd.timeline) : "—"}</dd></>
                                  <><dt className="text-muted-foreground">{t("rfqDetail.fields.warranty")}</dt><dd>{pd?.warranty != null && pd.warranty !== "" ? String(pd.warranty) : "—"}</dd></>
                                  <><dt className="text-muted-foreground">{t("rfqDetail.fields.scopeOfWork")}</dt><dd>{pd?.scopeOfWork != null && pd.scopeOfWork !== "" ? String(pd.scopeOfWork) : "—"}</dd></>
                                  <><dt className="text-muted-foreground">{t("rfqDetail.fields.technicalProposal")}</dt><dd>{pd?.technicalProposal != null && pd.technicalProposal !== "" ? String(pd.technicalProposal) : "—"}</dd></>
                                  <><dt className="text-muted-foreground sm:col-span-1">{t("rfqDetail.fields.notes")}</dt><dd className="sm:col-span-1">{pd?.notes != null && pd.notes !== "" ? String(pd.notes) : "—"}</dd></>
                                </dl>
                              </div>

                              <div className="w-full mt-1 pt-2 border-t border-muted/50 space-y-2">
                                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                  <CreditCard className="h-3.5 w-3.5" />
                                  {t("rfqDetail.paymentTermsInstallments")}
                                </p>
                                <Table>
                                  <TableHeader>
                                    <TableRow className="border-muted/50 hover:bg-transparent">
                                      <TableHead className="text-xs font-medium">{t("rfqDetail.table.sequence")}</TableHead>
                                      <TableHead className="text-xs font-medium">{t("rfqDetail.table.percent")}</TableHead>
                                      <TableHead className="text-xs font-medium">{t("rfqDetail.table.whenDue")}</TableHead>
                                      <TableHead className="text-xs font-medium">{t("rfqDetail.table.attachments")}</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {quotePaymentTerms.length === 0 ? (
                                      <TableRow className="border-muted/50">
                                        <TableCell colSpan={4} className="text-xs py-3 text-center text-muted-foreground">
                                          {t("rfqDetail.noPaymentTerms")}
                                        </TableCell>
                                      </TableRow>
                                    ) : (
                                      quotePaymentTerms
                                        .slice()
                                        .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
                                        .map((term) => {
                                          const termAttachments = Array.isArray(term.attachments) ? term.attachments : [];
                                          return (
                                            <TableRow key={term.id ?? term.sequence ?? 0} className="border-muted/50">
                                              <TableCell className="text-xs py-1">{term.sequence ?? "—"}</TableCell>
                                              <TableCell className="text-xs py-1">{term.percent ?? "—"}%</TableCell>
                                              <TableCell className="text-xs py-1">{paymentTriggerLabel(term.trigger)}</TableCell>
                                              <TableCell className="text-xs py-1">
                                                {termAttachments.length > 0 ? (
                                                  <ul className="space-y-0.5">
                                                    {termAttachments.map((att) => (
                                                      <li key={att.id ?? att.fileName}>
                                                        {att.fileUrl ? (
                                                          <a
                                                            href={att.fileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-primary hover:underline"
                                                          >
                                                            {att.fileName ?? t("rfqDetail.attachment")}
                                                          </a>
                                                        ) : (
                                                          <span>{att.fileName ?? "—"}</span>
                                                        )}
                                                      </li>
                                                    ))}
                                                  </ul>
                                                ) : (
                                                  <span className="text-muted-foreground">—</span>
                                                )}
                                              </TableCell>
                                            </TableRow>
                                          );
                                        })
                                    )}
                                  </TableBody>
                                </Table>
                                {quotePaymentTerms.length > 0 && (
                                  <div className="flex gap-1.5 rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                    <span>
                                      {t("rfqDetail.installmentsInfo", { count: quotePaymentTerms.length })}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </li>
                          );
                        })}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
