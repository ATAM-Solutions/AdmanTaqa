import useProviderRfqById from "@/hooks/Provider/useProviderRfqById";

type RawQuote = { id?: number; status?: string; ExternalJobOrder?: { id?: number; status?: string; PaymentRecord?: { status?: string } } | null };

/**
 * The job order created from a SELECTED quotation, read from the RFQ the quotation belongs to (the quotations-web
 * API does not carry it). Only queries when the quotation is SELECTED; every other status can have no job order.
 * `jobOrder` stays undefined while loading and null once we know there is none.
 */
export default function useQuoteJobOrder(externalRequestId: number | undefined, quoteId: number | undefined, status: string | undefined) {
  const enabled = status === "SELECTED" && externalRequestId != null;
  const q = useProviderRfqById(enabled ? externalRequestId : null);
  const quotes = ((q.data as { ProviderQuotes?: RawQuote[] } | null | undefined)?.ProviderQuotes ?? []) as RawQuote[];
  const mine = quotes.find((x) => x.id === quoteId);
  const jobOrder = !enabled ? null : q.isLoading ? undefined : q.isError ? null : mine?.ExternalJobOrder?.id != null ? mine.ExternalJobOrder : null;
  return { jobOrder, isLoading: enabled && q.isLoading };
}
