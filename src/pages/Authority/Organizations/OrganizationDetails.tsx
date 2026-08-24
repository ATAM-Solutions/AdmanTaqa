import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  ChevronLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  FileText,
  Briefcase,
  Mail,
  Phone,
  User,
  MapPin,
  Users as UsersIcon,
  History,
} from "lucide-react";
import useGetOrganizationById from "@/hooks/Organization/useGetOrganizationById";
import OrganizationActions from "./Component/OrganizationActions";
import type { OrganizationByIdFull } from "@/types/organization";
import { formatDate } from "@/lib/i18n/formatters";

export default function OrganizationDetails() {
  const { t, i18n } = useTranslation("authority");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const orgId = id ?? "";
  const isFuelStationContext = location.pathname.startsWith("/fuel-stations/");
  const backPath = isFuelStationContext ? "/fuel-stations" : "/organizations";

  const { data: org, isLoading: orgLoading, isError: orgError } = useGetOrganizationById(orgId);
  const orgFull = org as OrganizationByIdFull | null | undefined;
  const documents = orgFull?.OrganizationDocuments ?? [];
  const serviceProvider = orgFull?.ServiceProviderProfile;
  const branches = orgFull?.Branches ?? [];
  const users = orgFull?.Users ?? [];
  const approvalHistory = [...(orgFull?.OrganizationApprovals ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900 gap-1.5 px-3 py-1 shadow-none font-bold uppercase text-[10px]">
            <CheckCircle2 className="h-3 w-3" />
            {t("organizations.status.approved")}
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="secondary" className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900 gap-1.5 px-3 py-1 shadow-none font-bold uppercase text-[10px]">
            <Clock className="h-3 w-3" />
            {t("organizations.status.pendingReview")}
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive" className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900 gap-1.5 px-3 py-1 shadow-none font-bold uppercase text-[10px]">
            <XCircle className="h-3 w-3" />
            {t("organizations.status.rejected")}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getDocUrl = (url?: string, fileUrl?: string) => url ?? fileUrl ?? "#";

  const getDocTypeLabel = (documentType?: string) => {
    if (documentType && (documentType === "LICENSE" || documentType === "REGISTRATION" || documentType === "OTHER")) {
      return t(`organizations.docTypes.${documentType}`);
    }
    return documentType ?? t("organizations.docTypes.document");
  };

  if (orgLoading || !id) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center min-h-[200px] text-muted-foreground">
        {t("organizations.detail.loading")}
      </div>
    );
  }

  if (orgError || !org) {
    return (
      <div className="p-4 md:p-8">
        <Button variant="ghost" onClick={() => navigate(backPath)} className="mb-4">
          <ChevronLeft className="h-4 w-4 me-2 rtl:rotate-180" /> {t("organizations.detail.back")}
        </Button>
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-destructive">
          {t("organizations.detail.notFound")}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in zoom-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(backPath)}
            className="rounded-full hover:bg-accent shadow-sm border border-transparent hover:border-border"
          >
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">{org.name}</h1>
              {getStatusBadge(org.status)}
            </div>
            <p className="text-muted-foreground flex items-center gap-2">
              <span className="font-mono text-xs font-semibold bg-muted px-2 py-0.5 rounded text-muted-foreground" dir="ltr">
                ID: {org.id}
              </span>
              <span className="text-muted-foreground/50">•</span>
              <span className="text-xs font-medium uppercase tracking-wider">
                {org.type.replace("_", " ")}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <OrganizationActions
            orgId={org.id}
            orgName={org.name}
            status={org.status}
            onSuccess={() => navigate(backPath)}
          />
          {org.status !== "PENDING" && (
            <Button variant="outline" className="gap-2 shadow-sm">
              <Shield className="h-4 w-4" />
              {t("organizations.detail.managePermissions")}
            </Button>
          )}
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b bg-muted/50 py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {t("organizations.detail.profileInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="group">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      {t("organizations.detail.registrationDate")}
                    </p>
                    <p className="text-sm font-semibold">
                      {formatDate(org.createdAt, i18n.language, { dateStyle: "medium" })}
                    </p>
                  </div>
                  {org.approvedAt && (
                    <div className="group">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3" />
                        {t("organizations.detail.approvedAt")}
                      </p>
                      <p className="text-sm font-semibold">
                        {formatDate(org.approvedAt, i18n.language, { dateStyle: "medium" })}
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-6">
                  {org.rejectionReason && (
                    <div className="group">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-2">
                        <FileText className="h-3 w-3" />
                        {t("organizations.detail.rejectionReason")}
                      </p>
                      <p className="text-sm text-muted-foreground">{org.rejectionReason}</p>
                    </div>
                  )}
                </div>
              </div>

              {serviceProvider && (
                <div className="border-t pt-6 space-y-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    {t("organizations.detail.spProfile")}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {serviceProvider.licenseNumber != null && (
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{t("organizations.detail.licenseNumber")}</p>
                        <p className="font-medium">{serviceProvider.licenseNumber}</p>
                      </div>
                    )}
                    {serviceProvider.yearsExperience != null && (
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{t("organizations.detail.yearsExperience")}</p>
                        <p className="font-medium">{serviceProvider.yearsExperience}</p>
                      </div>
                    )}
                    {serviceProvider.street != null && serviceProvider.street !== "" && (
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{t("organizations.detail.street")}</p>
                        <p className="font-medium">{serviceProvider.street}</p>
                      </div>
                    )}
                    {serviceProvider.amount != null && (
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{t("organizations.detail.amount")}</p>
                        <p className="font-medium">{serviceProvider.amount}</p>
                      </div>
                    )}
                    {serviceProvider.Area && (
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{t("organizations.detail.area")}</p>
                        <p className="font-medium">{serviceProvider.Area.name}</p>
                      </div>
                    )}
                    {serviceProvider.City && (
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{t("organizations.detail.city")}</p>
                        <p className="font-medium">{serviceProvider.City.name}</p>
                      </div>
                    )}
                    {serviceProvider.serviceCategories && serviceProvider.serviceCategories.length > 0 && (
                      <div className="md:col-span-2">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{t("organizations.detail.serviceCategories")}</p>
                        <div className="flex flex-wrap gap-2">
                          {serviceProvider.serviceCategories.map((cat, i) => (
                            <Badge key={i} variant="outline">{cat}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="border-b bg-muted/50 py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {t("organizations.detail.documents")}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {t("organizations.detail.documentsSubtitle")}
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              {(() => {
                const orgDocs = documents.map((doc) => ({ ...doc, _source: "org" as const, _key: doc.id }));
                const spDocs = (serviceProvider?.ServiceProviderDocuments ?? []).map((doc) => ({ ...doc, _source: "sp" as const, _key: `sp-${doc.id}` }));
                const allDocs = [...orgDocs, ...spDocs];
                if (allDocs.length === 0) {
                  return <p className="text-sm text-muted-foreground italic">{t("organizations.detail.noDocuments")}</p>;
                }
                return (
                  <ul className="space-y-3">
                    {allDocs.map((doc) => (
                      <li key={doc._key} className="flex items-center justify-between rounded-lg border px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {doc.fileName ?? getDocTypeLabel(doc.documentType)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {getDocTypeLabel(doc.documentType)}
                            {doc.status ? ` • ${doc.status}` : ""}
                            {"createdAt" in doc && doc.createdAt ? ` • ${formatDate(doc.createdAt, i18n.language, { dateStyle: "medium" })}` : ""}
                          </p>
                        </div>
                        <a
                          href={getDocUrl(undefined, doc.fileUrl ?? undefined)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary hover:underline shrink-0"
                        >
                          {t("organizations.detail.view")}
                        </a>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </CardContent>
          </Card>

          {org.type === "FUEL_STATION" && (
            <Card className="border-none shadow-sm">
              <CardHeader className="border-b bg-muted/50 py-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  {t("organizations.detail.branches")}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("organizations.detail.branchesSubtitle")}
                </p>
              </CardHeader>
              <CardContent className="pt-6">
                {branches.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">{t("organizations.detail.noBranches")}</p>
                ) : (
                  <ul className="space-y-3">
                    {branches.map((branch) => (
                      <li key={branch.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {branch.nameEn ?? branch.nameAr ?? `#${branch.id}`}
                          </p>
                          {branch.Area?.name && (
                            <p className="text-xs text-muted-foreground mt-1">{branch.Area.name}</p>
                          )}
                        </div>
                        <Badge variant={branch.status === "ACTIVE" || branch.status === "APPROVED" ? "default" : "secondary"} className="shrink-0">
                          {branch.status === "APPROVED" || branch.status === "ACTIVE"
                            ? t("organizations.detail.branchActive")
                            : t("organizations.detail.branchInactive")}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border-none shadow-sm">
            <CardHeader className="border-b bg-muted/50 py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <UsersIcon className="h-5 w-5 text-primary" />
                {t("organizations.detail.users")}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {t("organizations.detail.usersSubtitle")}
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              {users.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">{t("organizations.detail.noUsers")}</p>
              ) : (
                <ul className="space-y-3">
                  {users.map((u) => (
                    <li key={u.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{u.fullName}</p>
                        <p className="text-xs text-muted-foreground mt-1" dir="ltr">{u.email}</p>
                      </div>
                      {!u.isActive && (
                        <Badge variant="secondary" className="shrink-0">
                          {t("organizations.detail.userInactive")}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="border-b bg-muted/50 py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                {t("organizations.detail.approvalHistory")}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {t("organizations.detail.approvalHistorySubtitle")}
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              {approvalHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">{t("organizations.detail.noApprovalHistory")}</p>
              ) : (
                <ul className="space-y-3">
                  {approvalHistory.map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(entry.status)}
                          <p className="text-xs text-muted-foreground">
                            {formatDate(entry.createdAt, i18n.language, { dateStyle: "medium" })}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {t("organizations.detail.reviewedBy", {
                            name: entry.User?.fullName ?? t("organizations.detail.unknownReviewer"),
                          })}
                        </p>
                        {entry.rejectionReason && (
                          <p className="text-xs text-muted-foreground mt-1">{entry.rejectionReason}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

        </div>

        <div className="space-y-6">
          {orgFull?.owner && (
            <Card className="border-none shadow-sm">
              <CardHeader className="border-b bg-muted/50 py-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  {t("organizations.detail.owner")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="p-4 rounded-xl border bg-muted/50 space-y-2">
                  {orgFull.owner.fullName && (
                    <p className="font-semibold text-sm flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {orgFull.owner.fullName}
                    </p>
                  )}
                  {orgFull.owner.email && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4 shrink-0" />
                      <a href={`mailto:${orgFull.owner.email}`} className="text-primary hover:underline" dir="ltr">{orgFull.owner.email}</a>
                    </p>
                  )}
                  {orgFull.owner.phone && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Phone className="h-4 w-4 shrink-0" />
                      <a href={`tel:${orgFull.owner.phone}`} className="text-primary hover:underline" dir="ltr">{orgFull.owner.phone}</a>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b bg-muted/50 py-4">
              <CardTitle className="text-lg">{t("organizations.detail.statusCardTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="p-4 rounded-xl border bg-muted/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {t("organizations.detail.current")}
                  </span>
                  {getStatusBadge(org.status)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
