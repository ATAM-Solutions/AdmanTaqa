import axiosInstance from "@/api/config";

export interface CurrencyOption {
  code: string;
  nameEn: string;
  nameAr: string;
  symbol: string;
}

/** Supported currencies (GET /api/meta/currencies) — the form renders a selector, never free text. */
export async function fetchCurrencies(): Promise<CurrencyOption[]> {
  const res = await axiosInstance.get<{ data?: CurrencyOption[] }>("meta/currencies");
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export interface QuotePricingInput {
  amount: number;
  currency: string;
  laborCost?: number;
  materialCost?: number;
  timeline?: string;
  warranty?: string;
  scopeOfWork?: string;
  technicalProposal?: string;
  notes?: string;
}

export interface QuoteTermInput {
  sequence: number;
  percent: number;
  trigger: string;
}

/** Error with the server's stable code/status so the form can show a translated, specific message. */
export class QuotationApiError extends Error {
  code: string | null;
  status: number | null;
  fields: { field: string; code: string }[];
  constructor(message: string, code: string | null, status: number | null, fields: { field: string; code: string }[]) {
    super(message);
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

const toError = (err: unknown): QuotationApiError => {
  const r = err as { response?: { status?: number; data?: { message?: string; code?: string; errors?: { fields?: { field: string; code: string }[] } } }; message?: string };
  return new QuotationApiError(
    r.response?.data?.message ?? r.message ?? "Request failed",
    typeof r.response?.data?.code === "string" ? r.response.data.code : null,
    r.response?.status ?? null,
    Array.isArray(r.response?.data?.errors?.fields) ? r.response!.data!.errors!.fields! : []
  );
};

export async function createProviderQuote(
  rfqId: number | string,
  body: { pricingJson: QuotePricingInput; paymentTerms: QuoteTermInput[]; submit: boolean }
): Promise<{ id: number; status: string }> {
  try {
    const res = await axiosInstance.post<{ data: { id: number; status: string } }>(`provider/rfqs/${rfqId}/quotes`, body);
    return res.data.data;
  } catch (e) {
    throw toError(e);
  }
}

export async function uploadQuoteAttachment(rfqId: number | string, quoteId: number | string, file: File): Promise<void> {
  try {
    const form = new FormData();
    form.append("file", file);
    await axiosInstance.post(`provider/rfqs/${rfqId}/quotes/${quoteId}/attachments`, form);
  } catch (e) {
    throw toError(e);
  }
}

export async function submitDraftQuote(quoteId: number | string): Promise<void> {
  try {
    await axiosInstance.patch(`provider/quotes/${quoteId}`, { submit: true });
  } catch (e) {
    throw toError(e);
  }
}
