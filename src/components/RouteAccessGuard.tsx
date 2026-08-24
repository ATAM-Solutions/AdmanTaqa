import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, ArrowLeft, ShieldAlert, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { ROUTE_ACCESS_RULES, canAccessByRule } from "@/lib/accessControl";

type Props = {
  pathKey: string;
  children: ReactNode;
};

export default function RouteAccessGuard({ pathKey, children }: Props) {
  const { t } = useTranslation();
  const { organization, permissions } = useAuth();
  const rule = ROUTE_ACCESS_RULES[pathKey];
  const allowed = canAccessByRule(rule, organization?.type, permissions);

  if (!allowed) {
    return (
      <div className="m-16 flex min-h-[80vh] flex-col items-center justify-center px-4 text-center animate-in fade-in zoom-in duration-700">
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-full bg-destructive/20 blur-3xl scale-150 animate-pulse" />
          <div className="relative flex items-center justify-center rounded-3xl border bg-card p-8 shadow-2xl">
            <ShieldAlert className="h-24 w-24 text-destructive animate-bounce" />
          </div>
          <div className="absolute -top-4 end-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950 shadow-lg animate-bounce delay-100">
            <LockKeyhole className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
        </div>

        <h1 className="mb-2 text-5xl font-black tracking-tight text-foreground">{t("accessDenied.title")}</h1>
        <h2 className="mb-4 text-xl font-bold tracking-wide text-foreground/80">{t("accessDenied.subtitle")}</h2>

        <p className="mb-10 max-w-md text-lg leading-relaxed text-muted-foreground">
          {t("accessDenied.description")}
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <Button asChild size="lg" className="h-12 gap-2 px-8 shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
            <Link to="/">
              <Home className="h-4 w-4" />
              {t("accessDenied.returnHome")}
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-12 gap-2 px-8 transition-all"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {t("accessDenied.goBack")}
          </Button>
        </div>

        <div className="mt-16 w-full max-w-xs border-t pt-8">
          <p className="mb-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">{t("accessDenied.errorCode")}</p>
          <p className="rounded bg-muted py-1 font-mono text-sm text-muted-foreground">ERR_FORBIDDEN_403</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
