import { useTranslation } from "react-i18next";
import { ArrowRight, Hourglass, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { NextAction } from "@/lib/externalFlow";

/** Says, for the signed-in viewer, what happens next on this job order and whether it is on them. */
export default function NextActionBanner({ action }: { action: NextAction }) {
  const { t } = useTranslation("flow");
  const Icon = action.actor === "you" ? ArrowRight : action.actor === "other" ? Hourglass : CheckCircle2;
  return (
    <Card
      data-testid="next-action"
      data-next-key={action.key}
      data-actor={action.actor}
      className={action.actor === "you" ? "border-primary/50 bg-primary/5" : undefined}
    >
      <CardContent className="flex items-start gap-3 py-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div className="text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t(`next.${action.actor}`)} · {t("next.title")}</p>
          <p className="font-medium">{t(`next.${action.key}`)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
