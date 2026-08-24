import { useRouteError, isRouteErrorResponse, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, AlertTriangle } from "lucide-react";

export default function RouteErrorBoundary() {
  const { t } = useTranslation();
  const error = useRouteError();
  const navigate = useNavigate();

  const message = isRouteErrorResponse(error)
    ? error.data?.message ?? error.statusText ?? t("routeError.fallbackMessage")
    : error instanceof Error
      ? error.message
      : t("routeError.fallbackMessage");

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 md:p-8 text-center">
      <div className="max-w-md w-full space-y-6">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground">{t("routeError.title")}</h1>
        <p className="text-muted-foreground">
          {message}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild size="lg" className="gap-2">
            <Link to="/">
              <Home className="h-4 w-4" />
              {t("routeError.returnHome")}
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="gap-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {t("routeError.goBack")}
          </Button>
        </div>
      </div>
    </div>
  );
}
