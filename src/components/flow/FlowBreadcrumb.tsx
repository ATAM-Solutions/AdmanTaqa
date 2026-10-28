import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

type Step = "rfq" | "quotation" | "jobOrder";

interface Props {
  side: "provider" | "station";
  current: Step | "stationRequest";
  rfqId?: number | string | null;
  quoteId?: number | string | null;
  jobOrderId?: number | string | null;
}

interface Crumb { key: string; label: string; to?: string; current?: boolean }

/**
 * RFQ → Quotation → Job Order trail. A step is a link only when its id is known AND the viewer may open that page,
 * so the trail never offers a dead end or a page the viewer has no access to. Navigation only: it grants nothing.
 */
export default function FlowBreadcrumb({ side, current, rfqId, quoteId, jobOrderId }: Props) {
  const { t } = useTranslation("flow");
  const { hasPermission } = useAuth();
  const has = (v?: number | string | null) => v != null && v !== "";
  const crumbs: Crumb[] = [];

  if (side === "provider") {
    const canQuote = hasPermission("quotations:read") || hasPermission("quotations:submit");
    if (has(rfqId)) crumbs.push({ key: "rfq", label: t("breadcrumb.rfq", { id: rfqId }), to: `/provider-rfqs/${rfqId}`, current: current === "rfq" });
    if (has(quoteId) && (canQuote || current === "quotation")) {
      crumbs.push({ key: "quotation", label: t("breadcrumb.quotation", { id: quoteId }), to: `/quotations/${quoteId}`, current: current === "quotation" });
    }
    if (has(jobOrderId)) crumbs.push({ key: "jobOrder", label: t("breadcrumb.jobOrder", { id: jobOrderId }), to: `/provider-job-orders/${jobOrderId}`, current: current === "jobOrder" });
  } else {
    if (has(rfqId)) crumbs.push({ key: "request", label: t("breadcrumb.stationRequest", { id: rfqId }), to: `/station-requests/${rfqId}`, current: current === "stationRequest" });
    if (has(jobOrderId)) crumbs.push({ key: "jobOrder", label: t("breadcrumb.jobOrder", { id: jobOrderId }), to: `/station-job-orders/${jobOrderId}`, current: current === "jobOrder" });
  }
  if (crumbs.length < 2) return null;

  return (
    <nav aria-label={t("breadcrumb.label")} data-testid="flow-breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-muted-foreground">
        {crumbs.map((c, i) => (
          <li key={c.key} className="flex items-center gap-1">
            {i > 0 ? <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden /> : null}
            {c.current || !c.to ? (
              <span aria-current={c.current ? "page" : undefined} className="font-medium text-foreground" data-crumb={c.key}>{c.label}</span>
            ) : (
              <Link to={c.to} className="hover:underline hover:text-foreground" data-crumb={c.key}>{c.label}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
