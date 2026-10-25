import { decimalPattern } from "@/lib/decimalPattern";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Paperclip, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/utils";
import ReportAttachmentTile from "@/components/ReportAttachmentTile";
import {
  QuotationApiError,
  createProviderQuote,
  fetchCurrencies,
  submitDraftQuote,
  uploadQuoteAttachment,
} from "@/api/services/quotationFormService";

const TRIGGERS = ["ON_APPROVAL", "ON_JOB_START", "ON_COMPLETION_SUBMITTED", "ON_JOB_CLOSED"] as const;
const KNOWN = [
  "QUOTING_CLOSED", "QUOTE_ALREADY_EXISTS", "RFQ_NOT_ASSIGNED", "CURRENCY_UNSUPPORTED", "CURRENCY_REQUIRED",
  "QUOTE_PRICING_INVALID", "QUOTE_NOT_DRAFT", "QUOTE_ATTACHMENT_LIMIT",
] as const;

type Props = {
  rfqId: number;
  /** server-computed: may this provider submit now, and if not why */
  quoting: { open?: boolean; canSubmit?: boolean; reason?: string | null; existingQuoteId?: number | null; existingStatus?: string | null } | null | undefined;
  /** An existing DRAFT quotation of this provider (continue: attach files and submit) */
  draft?: { id: number; attachments?: { id?: number; fileName?: string; fileUrl?: string }[] } | null;
};

/**
 * Provider quotation form (Report 3 finding 26). Pricing, duration, warranty, scope, technical offer, payment terms and
 * attachments. Eligibility, request state and duplicate handling are decided by the server (`quoting`, stable codes).
 * Flow with files: create a DRAFT → upload each file → submit the draft (attachments are only accepted on drafts).
 */
export default function QuotationForm({ rfqId, quoting, draft }: Props) {
  const { t, i18n } = useTranslation("provider");
  const qc = useQueryClient();
  const busyRef = useRef(false);
  const [f, setF] = useState({ amount: "", currency: "", laborCost: "", materialCost: "", timeline: "", warranty: "", scopeOfWork: "", technicalProposal: "", notes: "" });
  const [terms, setTerms] = useState<{ percent: string; trigger: string }[]>([{ percent: "100", trigger: "ON_APPROVAL" }]);
  const [files, setFiles] = useState<File[]>([]);
  const [problem, setProblem] = useState<string | null>(null);

  const currencies = useQuery({ queryKey: ["currencies"], queryFn: fetchCurrencies, staleTime: 60 * 60 * 1000, retry: false });
  const sum = terms.reduce((a, x) => a + (Number(x.percent) || 0), 0);
  const decimals = (currencies.data ?? []).find((c) => c.code === f.currency)?.decimals ?? 2;
  const DECIMAL = decimalPattern(decimals);
  const money = (v: string) => v.trim() === "" || DECIMAL.test(v.trim());
  const valid =
    DECIMAL.test(f.amount.trim()) && Number(f.amount) > 0 && !!f.currency && money(f.laborCost) && money(f.materialCost) &&
    terms.length >= 1 && terms.length <= 5 && Math.abs(sum - 100) < 0.01 && terms.every((x) => Number(x.percent) > 0 && !!x.trigger);

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["provider-rfq"] });
    await qc.invalidateQueries({ queryKey: ["provider-rfq", String(rfqId)] });
  };

  const explain = (e: unknown) => {
    const err = e as QuotationApiError;
    const known = KNOWN.find((c) => c === err.code);
    if (known === "QUOTE_PRICING_INVALID" && err.fields?.length) {
      return t("quoteForm.errors.QUOTE_PRICING_INVALID", { fields: err.fields.map((x) => t(`quoteForm.fields.${x.field}`, { defaultValue: x.field })).join(", ") });
    }
    return known ? t(`quoteForm.errors.${known}`) : getApiErrorMessage(e, t("quoteForm.errors.generic"));
  };

  const send = useMutation({
    mutationFn: async (mode: "submit" | "draft-continue") => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        let quoteId = draft?.id ?? null;
        if (mode === "submit") {
          const pricingJson = {
            amount: Number(f.amount),
            currency: f.currency,
            ...(f.laborCost.trim() ? { laborCost: Number(f.laborCost) } : {}),
            ...(f.materialCost.trim() ? { materialCost: Number(f.materialCost) } : {}),
            ...(f.timeline.trim() ? { timeline: f.timeline.trim() } : {}),
            ...(f.warranty.trim() ? { warranty: f.warranty.trim() } : {}),
            ...(f.scopeOfWork.trim() ? { scopeOfWork: f.scopeOfWork.trim() } : {}),
            ...(f.technicalProposal.trim() ? { technicalProposal: f.technicalProposal.trim() } : {}),
            ...(f.notes.trim() ? { notes: f.notes.trim() } : {}),
          };
          const paymentTerms = terms.map((x, i) => ({ sequence: i + 1, percent: Number(x.percent), trigger: x.trigger }));
          const created = await createProviderQuote(rfqId, { pricingJson, paymentTerms, submit: files.length === 0 });
          quoteId = created.id;
          if (files.length === 0) return;
        }
        if (quoteId == null) return;
        for (const file of files) await uploadQuoteAttachment(rfqId, quoteId, file);
        await submitDraftQuote(quoteId);
      } finally {
        busyRef.current = false;
      }
    },
    onSuccess: async () => {
      toast.success(t("quoteForm.submitted"));
      setFiles([]);
      setProblem(null);
      await refresh();
    },
    onError: async (e) => {
      const msg = explain(e);
      setProblem(msg);
      toast.error(msg);
      const status = (e as QuotationApiError).status;
      // 409/403: our view is stale — reload so the form disappears or shows the existing quotation
      if (status === 409 || status === 403 || status === 404) await refresh();
      // a draft may now exist (create worked, a later step failed): reload to continue it
      await refresh();
    },
  });

  if (quoting && quoting.canSubmit === false && !draft) {
    return (
      <Card data-testid="quote-form-unavailable">
        <CardContent className="py-4 text-sm text-muted-foreground">
          {quoting.reason === "QUOTING_CLOSED" ? t("quoteForm.closed") : quoting.reason === "QUOTE_ALREADY_EXISTS" ? t("quoteForm.alreadyExists") : t("quoteForm.unavailable")}
        </CardContent>
      </Card>
    );
  }

  if (draft) {
    return (
      <Card data-testid="quote-draft-panel">
        <CardHeader><CardTitle className="text-base">{t("quoteForm.draftTitle")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("quoteForm.draftHint")}</p>
          {problem ? <p className="text-sm text-destructive" role="alert" data-testid="quote-error">{problem}</p> : null}
          {(draft.attachments ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="draft-no-attachments">{t("quoteForm.noAttachments")}</p>
          ) : (
            <ul className="flex flex-wrap gap-3" data-testid="draft-attachments">
              {(draft.attachments ?? []).map((a, i) => (
                <li key={a.id ?? i} className="space-y-1">
                  {/* images preview (with an explicit failure tile); documents open in a new tab */}
                  <ReportAttachmentTile attachment={{ id: a.id ?? i, fileUrl: a.fileUrl ?? "", fileType: /\.(png|jpe?g|gif|webp)$/i.test(a.fileUrl ?? "") ? "IMAGE" : "PDF", caption: a.fileName ?? null }} />
                  <p className="max-w-[8rem] truncate text-xs" dir="auto" title={a.fileName}>{a.fileName}</p>
                </li>
              ))}
            </ul>
          )}
          <FilePicker files={files} setFiles={setFiles} t={t} />
          <Button disabled={send.isPending} onClick={() => send.mutate("draft-continue")} data-testid="quote-submit-draft">
            {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("quoteForm.submitDraft")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const currencyName = (c: { code: string; nameEn: string; nameAr: string }) => (i18n.language.startsWith("ar") ? c.nameAr : c.nameEn);
  const txt = (key: keyof typeof f, label: string, opts: { area?: boolean; numeric?: boolean } = {}) => (
    <div className="space-y-1">
      <Label htmlFor={`q-${key}`}>{label}</Label>
      {opts.area ? (
        <Textarea id={`q-${key}`} dir="auto" value={f[key]} onChange={(e) => setF((p) => ({ ...p, [key]: e.target.value }))} maxLength={5000} />
      ) : (
        <Input id={`q-${key}`} dir={opts.numeric ? "ltr" : "auto"} inputMode={opts.numeric ? "decimal" : undefined} value={f[key]}
          onChange={(e) => setF((p) => ({ ...p, [key]: e.target.value }))} aria-invalid={opts.numeric && f[key].trim() !== "" && !DECIMAL.test(f[key].trim())} />
      )}
    </div>
  );

  return (
    <Card data-testid="quote-form">
      <CardHeader><CardTitle className="text-base">{t("quoteForm.title")}</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        {problem ? <p className="text-sm text-destructive" role="alert" data-testid="quote-error">{problem}</p> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          {txt("amount", t("quoteForm.fields.amount"), { numeric: true })}
          <div className="space-y-1">
            <Label htmlFor="q-currency">{t("quoteForm.fields.currency")}</Label>
            {currencies.isError ? (
              <p className="text-xs text-destructive" role="alert">{t("quoteForm.currenciesFailed")} <button type="button" className="underline" onClick={() => currencies.refetch()}>{t("quoteForm.retry")}</button></p>
            ) : (
              <select id="q-currency" data-testid="quote-currency" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={f.currency} onChange={(e) => setF((p) => ({ ...p, currency: e.target.value }))}>
                <option value="">{currencies.isLoading ? t("quoteForm.loading") : t("quoteForm.chooseCurrency")}</option>
                {(currencies.data ?? []).map((c) => <option key={c.code} value={c.code}>{c.code} — {currencyName(c)}</option>)}
              </select>
            )}
          </div>
          {txt("laborCost", t("quoteForm.fields.laborCost"), { numeric: true })}
          {txt("materialCost", t("quoteForm.fields.materialCost"), { numeric: true })}
          {txt("timeline", t("quoteForm.fields.timeline"))}
          {txt("warranty", t("quoteForm.fields.warranty"))}
        </div>
        {txt("scopeOfWork", t("quoteForm.fields.scopeOfWork"), { area: true })}
        {txt("technicalProposal", t("quoteForm.fields.technicalProposal"), { area: true })}
        {txt("notes", t("quoteForm.fields.notes"), { area: true })}

        <div className="space-y-2">
          <p className="text-sm font-medium">{t("quoteForm.terms.title")}</p>
          {terms.map((term, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2" data-testid="quote-term">
              <div className="w-28 space-y-1">
                <Label className="text-xs">{t("quoteForm.terms.percent")}</Label>
                <Input type="number" min={1} max={100} dir="ltr" value={term.percent} onChange={(e) => setTerms((p) => p.map((x, j) => (j === i ? { ...x, percent: e.target.value } : x)))} />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <Label className="text-xs">{t("quoteForm.terms.when")}</Label>
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={term.trigger} onChange={(e) => setTerms((p) => p.map((x, j) => (j === i ? { ...x, trigger: e.target.value } : x)))}>
                  {TRIGGERS.map((tr) => <option key={tr} value={tr}>{t(`rfqDetail.paymentTriggers.${tr}`, { defaultValue: tr })}</option>)}
                </select>
              </div>
              {terms.length > 1 ? <Button type="button" size="icon" variant="ghost" aria-label={t("quoteForm.terms.remove")} onClick={() => setTerms((p) => p.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button> : null}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            {terms.length < 5 ? <Button type="button" size="sm" variant="outline" onClick={() => setTerms((p) => [...p, { percent: "0", trigger: "ON_JOB_CLOSED" }])}><Plus className="me-1 h-4 w-4" />{t("quoteForm.terms.add")}</Button> : null}
            <span className={`text-xs ${Math.abs(sum - 100) < 0.01 ? "text-muted-foreground" : "text-destructive"}`} data-testid="quote-terms-sum">{t("quoteForm.terms.sum", { sum })}</span>
          </div>
        </div>

        <FilePicker files={files} setFiles={setFiles} t={t} />

        <Button disabled={!valid || send.isPending} onClick={() => send.mutate("submit")} data-testid="quote-submit">
          {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("quoteForm.submit")}
        </Button>
      </CardContent>
    </Card>
  );
}

function FilePicker({ files, setFiles, t }: { files: File[]; setFiles: (f: File[]) => void; t: (k: string, o?: Record<string, unknown>) => string }) {
  return (
    <div className="space-y-2">
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm underline">
        <Paperclip className="h-4 w-4" />
        {t("quoteForm.attach")}
        <input type="file" multiple accept="application/pdf,image/*" className="sr-only" data-testid="quote-files"
          onChange={(e) => { setFiles([...files, ...Array.from(e.target.files ?? [])].slice(0, 10)); e.target.value = ""; }} />
      </label>
      {files.length > 0 ? (
        <ul className="space-y-1 text-sm" data-testid="quote-file-list">
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`} className="flex items-center justify-between gap-2">
              <span dir="auto" className="truncate">{file.name}</span>
              <Button type="button" size="icon" variant="ghost" aria-label={t("quoteForm.removeFile")} onClick={() => setFiles(files.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
