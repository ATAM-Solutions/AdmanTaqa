import { useTranslation } from "react-i18next";
import { Paperclip } from "lucide-react";
import type { ProviderQuoteSummary } from "@/types/station";

const FIELDS = ["laborCost", "materialCost", "timeline", "warranty", "scopeOfWork", "technicalProposal", "notes"] as const;

/** What the provider offered: price breakdown, scope, payment schedule and files — everything the station needs to compare quotes. */
export default function QuoteOfferDetails({ quote }: { quote: ProviderQuoteSummary }) {
  const { t } = useTranslation("station");
  const pricing = quote.pricing ?? {};
  const rows = FIELDS.filter((k) => pricing[k] != null && String(pricing[k]).trim() !== "");
  const terms = quote.paymentTerms ?? [];
  const files = quote.attachments ?? [];
  if (rows.length === 0 && terms.length === 0 && files.length === 0 && !quote.rejectionReason) return null;
  return (
    <div className="mt-2 w-full space-y-3 rounded-md bg-muted/40 p-3 text-xs" data-testid={`quote-details-${quote.id}`}>
      {rows.length > 0 && (
        <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[auto_1fr]">
          {rows.map((k) => (
            <div key={k} className="contents">
              <dt className="font-medium text-muted-foreground">{t(`quoteView.fields.${k}`)}</dt>
              <dd className="whitespace-pre-wrap break-words" dir="auto">{String(pricing[k])}</dd>
            </div>
          ))}
        </dl>
      )}
      {terms.length > 0 && (
        <div>
          <p className="mb-1 font-medium text-muted-foreground">{t("quoteView.paymentSchedule")}</p>
          <ul className="space-y-0.5">
            {terms.map((p) => (
              <li key={p.sequence} dir="auto">
                {t("quoteView.term", { sequence: p.sequence, percent: p.percent, trigger: t(`quoteView.triggers.${p.trigger}`, { defaultValue: p.trigger }) })}
                {p.note ? ` — ${p.note}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      {files.length > 0 && (
        <div>
          <p className="mb-1 font-medium text-muted-foreground">{t("quoteView.files")}</p>
          <ul className="space-y-0.5">
            {files.map((f) => (
              <li key={f.id}>
                <a href={f.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline" dir="auto">
                  <Paperclip className="h-3 w-3" aria-hidden="true" />
                  {f.fileName ?? t("quoteView.file", { id: f.id })}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {quote.rejectionReason && (
        <p className="text-destructive" dir="auto">
          <span className="font-medium">{t("quoteView.rejectionReason")}: </span>
          {quote.rejectionReason}
        </p>
      )}
    </div>
  );
}
