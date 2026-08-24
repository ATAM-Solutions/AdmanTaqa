import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Home, ArrowLeft, Ghost, Search, Map as MapIcon } from "lucide-react";

export default function NotFound() {
    const { t } = useTranslation("notFound");

    return (
        <div className="m-16 flex flex-col items-center justify-center min-h-[80vh] px-4 text-center animate-in fade-in zoom-in duration-700">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
                <div className="relative bg-card p-8 rounded-3xl shadow-2xl border border-border flex items-center justify-center">
                    <Ghost className="h-24 w-24 text-primary animate-bounce" />
                </div>
                <div className="absolute -top-4 end-4 h-12 w-12 bg-amber-100 dark:bg-amber-950 rounded-2xl flex items-center justify-center shadow-lg animate-bounce delay-100">
                    <Search className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="absolute -bottom-2 start-6 h-10 w-10 bg-blue-100 dark:bg-blue-950 rounded-xl flex items-center justify-center shadow-lg animate-bounce delay-300">
                    <MapIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
            </div>

            <h1 className="text-8xl font-black tracking-tighter text-foreground mb-2">404</h1>
            <h2 className="text-2xl font-bold text-foreground mb-4 uppercase tracking-wider">{t("heading")}</h2>

            <p className="max-w-md text-muted-foreground mb-10 text-lg leading-relaxed">
                {t("description")}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
                <Button asChild size="lg" className="h-12 px-8 gap-2 shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                    <Link to="/">
                        <Home className="h-4 w-4" />
                        {t("returnHome")}
                    </Link>
                </Button>
                <Button variant="outline" size="lg" className="h-12 px-8 gap-2 transition-all" onClick={() => window.history.back()}>
                    <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                    {t("goBack")}
                </Button>
            </div>

            <div className="mt-16 pt-8 border-t w-full max-w-xs">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mb-1">{t("errorCode")}</p>
                <p className="text-sm font-mono text-muted-foreground bg-muted py-1 rounded">ERR_ROUTE_NOT_DEFINED</p>
            </div>
        </div>
    );
}
