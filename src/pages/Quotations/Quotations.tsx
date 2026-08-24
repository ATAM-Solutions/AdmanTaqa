import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import useGetOrganization from "@/hooks/Organization/useGetOrganization";
import PendingApprovalGuard from "@/components/PendingApprovalGuard";
import useGetQuotations from "@/hooks/Quotations/useGetQuotations";
import useCreateQuotation from "@/hooks/Quotations/useCreateQuotation";
import { useQuotationsWebList, type QuotationsWebStatus } from "@/hooks/Quotations/useQuotationsWeb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, Plus } from "lucide-react";
import QuotationsTableHeader from "./Component/QuotationsTableHeader";
import TableQuotations from "./Component/TableQuotations";
import TableQuotationsWeb from "./Component/TableQuotationsWeb";
import { useAuth } from "@/context/AuthContext";
import { AsyncBoundary } from "@/components/patterns/AsyncBoundary";

const QUOTATIONS_WEB_STATUS_VALUES: (QuotationsWebStatus | "all")[] = [
  "all",
  "DRAFT",
  "SUBMITTED",
  "REVISED",
  "WITHDRAWN",
  "REJECTED",
  "SELECTED",
];

export default function Quotations() {
  const { t } = useTranslation("quotations");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 50;
  const [webStatus, setWebStatus] = useState<QuotationsWebStatus | "">("");
  const [serviceRequestId, setServiceRequestId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const { data: orgResponse, isLoading: orgLoading } = useGetOrganization();
  const { permissions, organization: authOrg } = useAuth();
  const organization = orgResponse?.data ?? authOrg;
  const isAuthority = organization?.type === "AUTHORITY";
  const isServiceProvider = organization?.type === "SERVICE_PROVIDER";
  const pageTitle = isAuthority ? t("title.authority") : t("title.default");
  const pageDescription = isAuthority ? t("description.authority") : t("description.default");

  const { data, isLoading, isError, error } = useGetQuotations(page, limit);
  const {
    data: webData,
    isLoading: webLoading,
    isError: webError,
    error: webErrorObj,
  } = useQuotationsWebList(
    { page, limit: 20, status: webStatus || undefined },
    { enabled: isServiceProvider }
  );

  const useWebList = isServiceProvider;
  const listData = useWebList ? webData : data;
  const listLoading = useWebList ? webLoading : isLoading;
  const listError = useWebList ? webError : isError;
  const listErrorObj = useWebList ? webErrorObj : error;
  const createQuotation = useCreateQuotation();

  const canSubmitQuotation =
    organization?.type === "SERVICE_PROVIDER" &&
    permissions.includes("quotations:submit");

  const handleSubmitOffer = (e: FormEvent) => {
    e.preventDefault();
    const requestIdNum = Number(serviceRequestId);
    const amountNum = Number(amount);
    if (!requestIdNum || Number.isNaN(requestIdNum)) {
      toast.error(t("toasts.invalidRequestId"));
      return;
    }
    if (!amountNum || Number.isNaN(amountNum)) {
      toast.error(t("toasts.invalidAmount"));
      return;
    }

    createQuotation.mutate(
      {
        serviceRequestId: requestIdNum,
        amount: amountNum,
        currency: currency || "USD",
      },
      {
        onSuccess: () => {
          toast.success(t("toasts.submitSuccess"));
          setIsCreateModalOpen(false);
          setServiceRequestId("");
          setAmount("");
          setCurrency("USD");
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : t("toasts.submitFailed"));
        },
      }
    );
  };

  const rows = (data?.items ?? []).map((item) => {
    const pricing = item.QuotationPricing;
    return {
      id: item.id,
      serviceRequestId: item.serviceRequestId,
      serviceProviderOrganizationId: item.serviceProviderOrganizationId,
      pricing: pricing ?? null,
      status: item.status,
      submittedAt: item.createdAt,
      providerName: item.Organization?.name ?? null,
      branchName:
        item.ServiceRequest?.Branch?.nameEn ??
        item.ServiceRequest?.Branch?.nameAr ??
        null,
      fuelStationName: item.ServiceRequest?.Organization?.name ?? null,
      submittedBy: item.User?.fullName ?? null,
      requestStatus: item.ServiceRequest?.status ?? null,
      priority: item.ServiceRequest?.formData?.priority ?? null,
      description: item.ServiceRequest?.formData?.description ?? null,
      amount: pricing?.amount != null ? String(pricing.amount) : null,
      currency: pricing?.currency ?? null,
    };
  });

  const webItems = webData?.items ?? [];
  const totalForPagination = listData?.total ?? 0;
  const pageForPagination = listData?.page ?? page;
  const limitForPagination = useWebList ? 20 : limit;
  const maxPage = Math.max(1, Math.ceil(totalForPagination / limitForPagination));

  return (
    <PendingApprovalGuard organization={organization} isLoading={orgLoading}>
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
          <p className="text-muted-foreground">
            {pageDescription}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canSubmitQuotation && (
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 shadow-md">
                  <Plus className="h-4 w-4" />
                  {t("submitNewOffer")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                  <DialogTitle>{t("submitDialog.title")}</DialogTitle>
                  <DialogDescription>
                    {t("submitDialog.description")}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmitOffer} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="serviceRequestId">{t("submitDialog.serviceRequestId")}</Label>
                    <Input
                      id="serviceRequestId"
                      type="number"
                      value={serviceRequestId}
                      onChange={(e) => setServiceRequestId(e.target.value)}
                      placeholder={t("submitDialog.serviceRequestIdPlaceholder")}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">{t("submitDialog.amount")}</Label>
                      <div className="relative">
                        <DollarSign className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="amount"
                          type="number"
                          className="ps-9"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">{t("submitDialog.currency")}</Label>
                      <Input
                        id="currency"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        placeholder="USD"
                        required
                      />
                    </div>
                  </div>
                  <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                      {t("submitDialog.cancel")}
                    </Button>
                    <Button type="submit" disabled={createQuotation.isPending}>
                      {createQuotation.isPending ? t("submitDialog.sending") : t("submitDialog.send")}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md">
        <QuotationsTableHeader total={listData?.total} page={listData?.page ?? page} />
        {useWebList && (
          <div className="px-6 pb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{t("table.status")}</span>
            <Select
              value={webStatus || "all"}
              onValueChange={(v) => {
                setWebStatus(v === "all" ? "" : (v as QuotationsWebStatus));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder={t("statusFilter.options.all")} />
              </SelectTrigger>
              <SelectContent>
                {QUOTATIONS_WEB_STATUS_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`statusFilter.options.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <AsyncBoundary
          isLoading={listLoading}
          error={listError ? (listErrorObj ?? new Error(t("loadFailed"))) : undefined}
          loadingFallback={<div className="p-6 text-sm text-muted-foreground">{t("loading")}</div>}
        >
          {useWebList ? (
            <TableQuotationsWeb items={webItems} />
          ) : (
            <TableQuotations
              quotations={rows}
              showAmountColumn={organization?.type !== "AUTHORITY"}
            />
          )}
        </AsyncBoundary>
        <div className="px-6 pb-6 flex items-center justify-between">
          <div />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              {t("pagination.previous")}
            </Button>
            <span className="text-sm text-muted-foreground">
              {t("pagination.pageOf", { page: pageForPagination, maxPage })}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage((p) => (p < maxPage ? p + 1 : p))}
              disabled={page >= maxPage}
            >
              {t("pagination.next")}
            </Button>
          </div>
        </div>
      </Card>
    </div>
    </PendingApprovalGuard>
  );
}
