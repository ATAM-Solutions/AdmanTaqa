import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  MapPin,
  Building2,
  CheckCircle2,
  XCircle,
  Calendar,
  Users,
  Phone,
  Loader2,
  AlertCircle,
  Pencil,
} from "lucide-react";
import useGetBranchesDetails from "@/hooks/Branches/useGetBranchesDetails";
import BranchLocationMap from "./Component/BranchLocationMap";
import { formatDate } from "@/lib/i18n/formatters";

export default function BranchDetails() {
  const { t, i18n } = useTranslation("branches");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: branch, isLoading, isError, error } = useGetBranchesDetails(id);

  const handleBack = () => navigate("/branches");

  const name = branch?.nameEn || branch?.nameAr || (branch ? String(branch.id) : "");
  const location = branch?.Area?.name ? `${branch.Area.name}${branch.address ? `, ${branch.address}` : ""}` : (branch?.address ?? "—");
  const isActive = branch ? branch.status === "APPROVED" && branch.isActive : false;
  const hasCoordinates =
    branch != null &&
    branch.latitude != null &&
    branch.longitude != null &&
    !Number.isNaN(parseFloat(String(branch.latitude))) &&
    !Number.isNaN(parseFloat(String(branch.longitude)));

  return (
    <div className="p-4 md:p-8">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin" />
          <p className="text-sm font-medium">{t("details.loading")}</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-sm font-medium text-center max-w-md text-muted-foreground">
            {error instanceof Error ? error.message : t("details.loadFailed")}
          </p>
          <Button variant="link" onClick={handleBack}>
            {t("details.backToBranches")}
          </Button>
        </div>
      ) : !branch ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
          <p className="text-sm font-medium">{t("details.notFound")}</p>
          <Button variant="link" onClick={handleBack}>
            {t("details.backToBranches")}
          </Button>
        </div>
      ) : (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            aria-label={t("details.backAriaLabel")}
            className="rounded-full shadow-sm border border-transparent hover:border-border"
          >
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-black tracking-tight text-foreground">{name}</h1>
              <Badge
                variant={isActive ? "default" : "secondary"}
                className={`shadow-none font-bold text-[10px] ${isActive ? "bg-green-600 hover:bg-green-600" : ""}`}
              >
                {isActive ? <CheckCircle2 className="h-3 w-3 me-1" /> : <XCircle className="h-3 w-3 me-1" />}
                {branch.status}
              </Badge>
            </div>
            <p className="text-muted-foreground flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-muted-foreground">{branch.id}</span>
              <span className="text-muted-foreground/50">•</span>
              <span className="text-xs font-medium">{t("details.orgPrefix", { id: branch.organizationId })}</span>
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-2 shrink-0">
          <Link to={`/branches/${branch.id}/edit`}>
            <Pencil className="h-4 w-4" />
            {t("details.editBranch")}
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b bg-muted/50 py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {t("details.branchInformation")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="group p-3 rounded-xl hover:bg-muted/50 transition-colors">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      {t("details.location")}
                    </p>
                    <p className="text-sm font-bold text-foreground">{location}</p>
                    {branch.street && <p className="text-xs text-muted-foreground mt-1">{branch.street}</p>}
                    {hasCoordinates && (
                      <p className="text-xs text-muted-foreground mt-1 font-mono" dir="ltr">
                        {String(branch.latitude)}, {String(branch.longitude)}
                      </p>
                    )}
                  </div>
                  <div className="group p-3 rounded-xl hover:bg-muted/50 transition-colors">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      {t("details.contact")}
                    </p>
                    <p className="text-sm font-bold text-foreground" dir="ltr">{branch.managerPhone ?? "—"}</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="group p-3 rounded-xl hover:bg-muted/50 transition-colors">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-2">
                      <Users className="h-3 w-3" />
                      {t("details.manager")}
                    </p>
                    <p className="text-sm font-bold text-foreground">{branch.managerName ?? "—"}</p>
                    {branch.managerEmail && (
                      <p className="text-xs text-muted-foreground mt-1">{branch.managerEmail}</p>
                    )}
                  </div>
                  <div className="group p-3 rounded-xl hover:bg-muted/50 transition-colors">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      {t("details.created")}
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {formatDate(branch.createdAt, i18n.language)}
                    </p>
                  </div>
                </div>
              </div>
              {branch.FuelStationType && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                    {t("details.stationType")}
                  </p>
                  <p className="text-sm font-bold text-foreground">{branch.FuelStationType.name}</p>
                  {branch.FuelStationType.code && (
                    <Badge variant="outline" className="mt-1 text-xs">{branch.FuelStationType.code}</Badge>
                  )}
                </div>
              )}
              {(branch.FuelTypes ?? []).length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                    {t("details.fuelTypes")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {branch.FuelTypes!.map((ft) => (
                      <Badge key={ft.id} variant="secondary">
                        {ft.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {hasCoordinates && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    {t("details.map")}
                  </p>
                  <BranchLocationMap
                    latitude={String(branch.latitude)}
                    longitude={String(branch.longitude)}
                    readOnly
                    height="220px"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b bg-muted/50 py-4">
              <CardTitle className="text-md">{t("details.detailsHeading")}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{t("details.license")}</span>
                <span className="font-medium">{branch.licenseNumber ?? "—"}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{t("details.status")}</span>
                <span className="font-medium">{branch.status}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{t("details.active")}</span>
                <span className="font-medium">{branch.isActive ? t("details.yes") : t("details.no")}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
      )}
    </div>
  );
}
