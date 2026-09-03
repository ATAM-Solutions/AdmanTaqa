import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  FileBadge,
  Mail,
  MapPin,
  Phone,
  Store,
  Users,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmDialog, EmptyState, PageHeader } from "@/components/patterns";
import { CompanyAvatar } from "@/components/company/CompanyAvatar";
import { ActiveBadge, OrganizationStatusBadge, OrganizationTypeBadge, StationStatusBadge } from "@/components/company/CompanyBadges";
import { CompanyLogoUploader } from "@/pages/Admin/Organizations/components/CompanyLogoUploader";
import { useAuth } from "@/context/AuthContext";
import useGetOrganizationFull from "@/hooks/Organization/useGetOrganizationFull";
import { useRemoveMyCompanyLogo, useUploadMyCompanyLogo } from "@/hooks/AdminOrganizations/useAdminOrganizations";
import { formatDate } from "@/lib/i18n/formatters";
import { getApiErrorMessage } from "@/lib/utils";
import { getOrganizationDisplayName, hasCompanyAdminRole } from "@/lib/company";

const PREVIEW_LIMIT = 8;

export default function CompanyProfile() {
  const { t, i18n } = useTranslation("adminOrganizations");
  const { organization: authOrganization, roles, hasPermission, refreshOrganization } = useAuth();
  const { data, isLoading, error, refetch } = useGetOrganizationFull();
  const uploadLogo = useUploadMyCompanyLogo();
  const removeLogo = useRemoveMyCompanyLogo();
  const [removeOpen, setRemoveOpen] = useState(false);

  const org = data?.data;
  const isArabic = i18n.language.startsWith("ar");
  const isCompanyAdmin = hasCompanyAdminRole(roles, authOrganization);
  const canManageBranding = isCompanyAdmin || hasPermission("organizations.update");
  const displayName = getOrganizationDisplayName(org ?? authOrganization, i18n.language);
  const dateOpts = { year: "numeric", month: "long", day: "numeric" } as const;
  const notSet = <span className="text-muted-foreground">{t("company.notSet")}</span>;

  const handleUpload = (file: File) => {
    uploadLogo.mutate(file, {
      onSuccess: async () => {
        toast.success(t("toasts.logoUploaded"));
        await refreshOrganization();
      },
      onError: (e) => toast.error(getApiErrorMessage(e, t("toasts.error"))),
    });
  };

  const handleRemove = () => {
    removeLogo.mutate(undefined, {
      onSuccess: async () => {
        toast.success(t("toasts.logoRemoved"));
        setRemoveOpen(false);
        await refreshOrganization();
      },
      onError: (e) => toast.error(getApiErrorMessage(e, t("toasts.error"))),
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <PageHeader title={t("company.title")} description={t("company.subtitle")} />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{getApiErrorMessage(error, t("toasts.loadFailed"))}</span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>{t("actions.retry")}</Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // OrganizationMeFullData still types FuelStationProfile loosely; narrow locally.
  const fuelStationProfile = org.FuelStationProfile as { registrationNumber?: string | null } | null | undefined;
  const registrationNumber =
    fuelStationProfile?.registrationNumber ?? org.ServiceProviderProfile?.licenseNumber ?? null;
  const branches = org.Branches ?? [];
  const users = org.Users ?? [];
  const isFuelStation = org.type === "FUEL_STATION";

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
      <PageHeader title={t("company.title")} description={t("company.subtitle")} />

      {/* ── Identity ─────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="shrink-0">
              {canManageBranding ? (
                <CompanyLogoUploader
                  logoUrl={org.logoUrl ?? null}
                  name={displayName}
                  isUploading={uploadLogo.isPending}
                  progress={uploadLogo.progress}
                  onUpload={handleUpload}
                  onRemove={org.logoUrl ? () => setRemoveOpen(true) : undefined}
                  isRemoving={removeLogo.isPending}
                  size="lg"
                />
              ) : (
                <CompanyAvatar logoUrl={org.logoUrl} name={displayName} size="xl" />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <h2 className="text-2xl font-bold tracking-tight truncate" dir="auto">{displayName}</h2>
                {org.nameAr && org.name && org.nameAr !== org.name ? (
                  <p className="text-muted-foreground truncate" dir="auto">{isArabic ? org.name : org.nameAr}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isCompanyAdmin ? (
                  <Badge className="bg-primary text-primary-foreground px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                    {t("company.roleBadge")}
                  </Badge>
                ) : null}
                <OrganizationTypeBadge type={org.type} />
                <OrganizationStatusBadge status={org.status} />
                <ActiveBadge isActive={org.isActive ?? true} />
              </div>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                {t("company.memberSince", { date: formatDate(org.createdAt, i18n.language, dateOpts) })}
              </p>
              {canManageBranding ? <p className="text-xs text-muted-foreground">{t("company.logoHint")}</p> : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── Contact ───────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              {t("company.contact")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <InfoField icon={<Mail className="h-3.5 w-3.5" />} label={t("company.email")}>
                {org.email ? <span dir="ltr">{org.email}</span> : notSet}
              </InfoField>
              <InfoField icon={<Phone className="h-3.5 w-3.5" />} label={t("company.phone")}>
                {org.phone ? <span dir="ltr">{org.phone}</span> : notSet}
              </InfoField>
              <InfoField icon={<MapPin className="h-3.5 w-3.5" />} label={t("company.city")}>
                {org.City?.name ?? notSet}
              </InfoField>
              <InfoField icon={<MapPin className="h-3.5 w-3.5" />} label={t("company.address")}>
                {org.address ? <span dir="auto">{org.address}</span> : notSet}
              </InfoField>
            </dl>
          </CardContent>
        </Card>

        {/* ── Registration ──────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileBadge className="h-4 w-4 text-primary" />
              {t("company.registration")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <InfoField icon={<FileBadge className="h-3.5 w-3.5" />} label={t("company.registrationNumber")}>
                {registrationNumber ? <span dir="ltr" className="font-mono">{registrationNumber}</span> : notSet}
              </InfoField>
              <InfoField icon={<Building2 className="h-3.5 w-3.5" />} label={t("company.status")}>
                <OrganizationStatusBadge status={org.status} />
              </InfoField>
              <InfoField icon={<CalendarDays className="h-3.5 w-3.5" />} label={t("detail.overview.approvedAt")}>
                {org.approvedAt ? formatDate(org.approvedAt, i18n.language, dateOpts) : notSet}
              </InfoField>
              <InfoField icon={<CalendarDays className="h-3.5 w-3.5" />} label={t("detail.overview.createdAt")}>
                {formatDate(org.createdAt, i18n.language, dateOpts)}
              </InfoField>
            </dl>
          </CardContent>
        </Card>

        {/* ── Stations ──────────────────────────────────────────── */}
        {isFuelStation ? (
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Store className="h-4 w-4 text-primary" />
                  {t("company.stations")}
                </CardTitle>
                <CardDescription>{t("detail.stations.description")}</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/branches" className="gap-1 text-xs">
                  {t("company.viewAllStations")} <ArrowRight className="h-3 w-3 rtl:rotate-180" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {branches.length === 0 ? (
                <EmptyState icon={<Store className="h-6 w-6" />} title={t("company.noStations")} className="py-8" />
              ) : (
                <ul className="divide-y">
                  {branches.slice(0, PREVIEW_LIMIT).map((branch) => {
                    const name = (isArabic ? branch.nameAr : branch.nameEn) || branch.nameEn || branch.nameAr || "";
                    return (
                      <li key={branch.id}>
                        <Link to={`/branches/${branch.id}`} className="flex items-center justify-between gap-3 px-1 py-2.5 hover:bg-muted/60 rounded-lg transition-colors">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium" dir="auto">{name}</span>
                            <span className="block truncate text-xs text-muted-foreground" dir="auto">
                              {branch.Area?.name ?? branch.address ?? ""}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-1.5">
                            {branch.isActive ? (
                              <StationStatusBadge status={branch.status} className="text-[10px] px-1.5 py-0" />
                            ) : (
                              <ActiveBadge isActive={false} className="text-[10px] px-1.5 py-0" />
                            )}
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground rtl:rotate-180" />
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        ) : null}

        {/* ── Users ─────────────────────────────────────────────── */}
        <Card className={isFuelStation ? "" : "lg:col-span-2"}>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                {t("company.users")}
              </CardTitle>
              <CardDescription>{t("detail.users.description")}</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/users" className="gap-1 text-xs">
                {t("company.viewAllUsers")} <ArrowRight className="h-3 w-3 rtl:rotate-180" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <EmptyState icon={<Users className="h-6 w-6" />} title={t("company.noUsers")} className="py-8" />
            ) : (
              <ul className="divide-y">
                {users.slice(0, PREVIEW_LIMIT).map((user) => (
                  <li key={user.id}>
                    <Link to={`/users/${user.id}`} className="flex items-center justify-between gap-3 px-1 py-2.5 hover:bg-muted/60 rounded-lg transition-colors">
                      <span className="flex items-center gap-3 min-w-0">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold uppercase">
                          {user.fullName
                            .split(/\s+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((w) => w[0])
                            .join("")}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium" dir="auto">{user.fullName}</span>
                          <span className="block truncate text-xs text-muted-foreground" dir="ltr">{user.email}</span>
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <ActiveBadge isActive={user.isActive} className="text-[10px] px-1.5 py-0" />
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground rtl:rotate-180" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title={t("confirm.removeLogoTitle")}
        description={t("confirm.removeLogoDescription")}
        confirmLabel={t("actions.removeLogo")}
        variant="destructive"
        isPending={removeLogo.isPending}
        onConfirm={handleRemove}
      />
    </div>
  );
}

function InfoField({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 font-medium break-words">{children}</dd>
    </div>
  );
}
