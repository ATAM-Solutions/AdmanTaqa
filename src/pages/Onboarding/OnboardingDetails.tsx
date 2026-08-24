import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, FileText, ImageIcon, Hash, Calendar, Loader2 } from "lucide-react";
import useGetOnboardingById from "@/hooks/Onboarding/useGetOnboardingById";
import { formatDate } from "@/lib/i18n/formatters";

export default function OnboardingDetails() {
  const { t, i18n } = useTranslation("onboarding");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: item, isLoading: loading, isError } = useGetOnboardingById(id);

  const formatItemDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      return formatDate(dateStr, i18n.language, { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-4 md:p-8">
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      ) : isError || !item ? (
        <div className="space-y-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/onboarding")} className="rounded-full">
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{t("details.notFound")}</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate("/onboarding")}>
                {t("details.backToList")}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/onboarding")}
            className="rounded-full shadow-sm border border-transparent hover:border-border"
          >
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-black tracking-tight">{item.title}</h1>
              <Badge variant={item.isActive ? "default" : "secondary"} className="font-bold uppercase text-[10px]">
                {item.isActive ? t("details.active") : t("details.inactive")}
              </Badge>
            </div>
            <p className="text-muted-foreground flex items-center gap-2">
              <span className="font-mono text-xs font-semibold bg-muted px-2 py-0.5 rounded" dir="ltr">#{item.id}</span>
              <span className="text-muted-foreground/50">•</span>
              <span className="flex items-center gap-1">
                <Hash className="h-3.5 w-3.5" />
                {t("details.order")} {item.order}
              </span>
            </p>
          </div>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => navigate("/onboarding")}>
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          {t("details.backToList")}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {item.description && (
            <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {t("details.description")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{item.description}</p>
              </CardContent>
            </Card>
          )}

          {item.content && (
            <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {t("details.content")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-muted-foreground whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none">
                  {item.content}
                </div>
              </CardContent>
            </Card>
          )}

          {!item.description && !item.content && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                {t("details.noContent")}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {item.imageUrl && (
            <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  {t("details.image")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full rounded-lg object-contain max-h-80 border bg-muted/30"
                />
              </CardContent>
            </Card>
          )}

          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base">{t("details.detailsHeading")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("details.order")}</span>
                <span className="font-medium">{item.order}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("details.status")}</span>
                <Badge variant={item.isActive ? "default" : "secondary"} className="text-xs">
                  {item.isActive ? t("details.active") : t("details.inactive")}
                </Badge>
              </div>
              {(item.createdAt || item.updatedAt) && (
                <>
                  {item.createdAt && (
                    <div className="flex items-center gap-2 text-muted-foreground pt-2 border-t">
                      <Calendar className="h-4 w-4" />
                      <span>{t("details.created", { date: formatItemDate(item.createdAt) })}</span>
                    </div>
                  )}
                  {item.updatedAt && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{t("details.updated", { date: formatItemDate(item.updatedAt) })}</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
      )}
    </div>
  );
}
