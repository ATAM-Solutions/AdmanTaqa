import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Briefcase, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import useQuoteJobOrder from "@/hooks/Quotations/useQuoteJobOrder";

interface Props {
  externalRequestId?: number;
  quoteId: number;
  status?: string;
  /** compact = table row; default = detail page */
  compact?: boolean;
}

/** Navigation from a provider quotation to its RFQ and (once selected) its job order. No payment actions here. */
export default function QuoteFlowLinks({ externalRequestId, quoteId, status, compact }: Props) {
  const { t } = useTranslation("flow");
  const { jobOrder, isLoading } = useQuoteJobOrder(externalRequestId, quoteId, status);
  const size = compact ? "sm" : "default";
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="quote-flow-links">
      {externalRequestId != null ? (
        <Button variant="ghost" size={size} asChild>
          <Link to={`/provider-rfqs/${externalRequestId}`} className="gap-1" data-testid="link-rfq">
            <FileSearch className="h-4 w-4" />{t("openRfq")}
          </Link>
        </Button>
      ) : null}
      {status === "SELECTED" ? (
        jobOrder?.id != null ? (
          <Button variant={compact ? "outline" : "default"} size={size} asChild>
            <Link to={`/provider-job-orders/${jobOrder.id}`} className="gap-1" data-testid="link-job-order">
              <Briefcase className="h-4 w-4" />{t("openJobOrder")}
            </Link>
          </Button>
        ) : isLoading ? null : (
          <span className="text-xs text-muted-foreground" data-testid="job-order-missing">{t("jobOrderPending")}</span>
        )
      ) : null}
    </div>
  );
}
