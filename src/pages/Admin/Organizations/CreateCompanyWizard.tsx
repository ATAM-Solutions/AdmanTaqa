import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  GitBranch,
  Loader2,
  MapPin,
  Plus,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, ConfirmDialog, EmptyState } from "@/components/patterns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyAvatar } from "@/components/company/CompanyAvatar";
import { OrganizationTypeBadge } from "@/components/company/CompanyBadges";
import {
  useCreateAdminOrganization,
  useRemoveAdminOrganizationLogo,
  useUploadAdminOrganizationLogo,
} from "@/hooks/AdminOrganizations/useAdminOrganizations";
import { useGetAdminStations } from "@/hooks/AdminOrganizations/useAdminStations";
import { getOrganizationDisplayName } from "@/lib/company";
import { getApiErrorMessage, cn } from "@/lib/utils";
import { formatNumber } from "@/lib/i18n/formatters";
import type { AdminOrganizationDetail, AdminUser } from "@/types/adminOrganization";
import { CompanyForm, type CompanyFormValues } from "./components/CompanyForm";
import { toCreateBody } from "./components/companyForm.helpers";
import { CompanyLogoUploader } from "./components/CompanyLogoUploader";
import { StationFormDialog } from "./components/StationFormDialog";
import { CompanyUserForm } from "./components/CompanyUserFormDialog";

type Step = 1 | 2 | 3 | 4;

const STEP_KEYS = ["company", "stations", "admin"] as const;

export default function CreateCompanyWizard() {
  const { t, i18n } = useTranslation("adminOrganizations");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetType = searchParams.get("type");
  const initialType: CompanyFormValues["type"] = presetType === "SERVICE_PROVIDER" ? "SERVICE_PROVIDER" : "FUEL_STATION";

  const [step, setStep] = useState<Step>(1);
  const [org, setOrg] = useState<AdminOrganizationDetail | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [admin, setAdmin] = useState<{ user: AdminUser; password: string } | null>(null);
  const [stationDialogOpen, setStationDialogOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [copied, setCopied] = useState<"email" | "password" | null>(null);
  const [wizardKey, setWizardKey] = useState(0);

  const createMutation = useCreateAdminOrganization();
  const uploadLogo = useUploadAdminOrganizationLogo();
  const removeLogo = useRemoveAdminOrganizationLogo();
  const stationsQuery = useGetAdminStations(org?.id);
  const stations = stationsQuery.data ?? [];
  const isFuelStation = org?.type === "FUEL_STATION";

  const displayName = useMemo(() => (org ? getOrganizationDisplayName(org, i18n.language) : ""), [org, i18n.language]);

  const handleCreate = async (values: CompanyFormValues) => {
    setCreateError(null);
    try {
      const created = await createMutation.mutateAsync(toCreateBody(values));
      setOrg(created);
      toast.success(t("toasts.companyCreated"));
    } catch (err) {
      const msg = getApiErrorMessage(err, t("toasts.error"));
      setCreateError(msg);
      toast.error(msg);
    }
  };

  const handleLogoUpload = (file: File) => {
    if (!org) return;
    uploadLogo.mutate(
      { id: org.id, file },
      {
        onSuccess: (updated) => {
          setOrg((prev) => (prev ? { ...prev, logoUrl: updated.logoUrl } : prev));
          toast.success(t("toasts.logoUploaded"));
        },
        onError: (err) => toast.error(getApiErrorMessage(err, t("toasts.error"))),
      }
    );
  };

  const handleLogoRemove = () => {
    if (!org) return;
    removeLogo.mutate(org.id, {
      onSuccess: () => {
        setOrg((prev) => (prev ? { ...prev, logoUrl: null } : prev));
        toast.success(t("toasts.logoRemoved"));
      },
      onError: (err) => toast.error(getApiErrorMessage(err, t("toasts.error"))),
    });
  };

  const copyToClipboard = async (value: string, which: "email" | "password") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      window.setTimeout(() => setCopied((c) => (c === which ? null : c)), 1500);
    } catch {
      toast.error(t("toasts.error"));
    }
  };

  const resetWizard = () => {
    setStep(1);
    setOrg(null);
    setAdmin(null);
    setCreateError(null);
    setCopied(null);
    setWizardKey((k) => k + 1);
  };

  const requestLeave = () => {
    if (org && step < 4) setLeaveOpen(true);
    else navigate("/organizations");
  };

  const stepIndex = Math.min(step, 3);

  return (
    <div className="p-4 md:p-8 animate-in fade-in duration-500">
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          title={t("wizard.title")}
          description={t("wizard.subtitle")}
          action={
            step < 4 ? (
              <Button variant="ghost" onClick={requestLeave}>
                {t("actions.cancel")}
              </Button>
            ) : null
          }
        />

        {/* Stepper */}
        <ol className="grid grid-cols-3 gap-2" aria-label={t("wizard.stepOf", { current: stepIndex, total: 3 })}>
          {STEP_KEYS.map((key, i) => {
            const n = i + 1;
            const done = step > n;
            const current = step === n;
            return (
              <li key={key} className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition-colors",
                    done ? "border-primary bg-primary text-primary-foreground" : current ? "border-primary text-primary" : "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : formatNumber(n, i18n.language)}
                </span>
                <span className={cn("text-sm font-medium truncate", current ? "text-foreground" : "text-muted-foreground")}>
                  {t(`wizard.steps.${key}`)}
                </span>
                {i < STEP_KEYS.length - 1 ? <span className="hidden sm:block h-px flex-1 bg-border" /> : null}
              </li>
            );
          })}
        </ol>

        {/* Company summary (once created) */}
        {org && step < 4 ? (
          <div className="flex items-center gap-3 rounded-xl border bg-muted/30 px-4 py-3">
            <CompanyAvatar logoUrl={org.logoUrl} name={org.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{displayName}</p>
              <p className="text-xs text-muted-foreground">{t("wizard.company.created")}</p>
            </div>
            <OrganizationTypeBadge type={org.type} />
          </div>
        ) : null}

        {/* ── Step 1: Company ────────────────────────────────────── */}
        {step === 1 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {t("wizard.company.title")}
              </CardTitle>
              <CardDescription>{t("wizard.company.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!org ? (
                <>
                  {createError ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{createError}</AlertDescription>
                    </Alert>
                  ) : null}
                  <p className="text-sm text-muted-foreground">{t("wizard.company.logoAfterCreate")}</p>
                  <CompanyForm
                    key={`company-form-${wizardKey}`}
                    mode="create"
                    defaultValues={{ type: initialType }}
                    isSubmitting={createMutation.isPending}
                    submitLabel={t("wizard.company.submit")}
                    onSubmit={handleCreate}
                    onCancel={requestLeave}
                    formId="wizard-company-form"
                  />
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t("logo.title")}</h3>
                    <CompanyLogoUploader
                      logoUrl={org.logoUrl}
                      name={org.name}
                      isUploading={uploadLogo.isPending}
                      progress={uploadLogo.progress}
                      onUpload={handleLogoUpload}
                      onRemove={handleLogoRemove}
                      isRemoving={removeLogo.isPending}
                      size="lg"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={() => setStep(2)} disabled={uploadLogo.isPending} className="gap-2">
                      {t("actions.next")}
                      <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ) : null}

        {/* ── Step 2: Stations ───────────────────────────────────── */}
        {step === 2 && org ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-primary" />
                {t("wizard.stations.title")}
              </CardTitle>
              <CardDescription>{t("wizard.stations.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isFuelStation ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{t("wizard.stations.notFuelStation")}</AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">
                      {stationsQuery.isLoading ? <Skeleton className="h-4 w-32" /> : t("wizard.stations.addedCount", { count: stations.length })}
                    </div>
                    <Button variant="outline" className="gap-2" onClick={() => setStationDialogOpen(true)}>
                      <Plus className="h-4 w-4" />
                      {t("actions.addStation")}
                    </Button>
                  </div>
                  {stationsQuery.isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-14 w-full" />
                      <Skeleton className="h-14 w-full" />
                    </div>
                  ) : stationsQuery.error ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="flex items-center justify-between gap-4">
                        <span>{getApiErrorMessage(stationsQuery.error, t("toasts.loadFailed"))}</span>
                        <Button size="sm" variant="outline" onClick={() => stationsQuery.refetch()}>{t("actions.retry")}</Button>
                      </AlertDescription>
                    </Alert>
                  ) : stations.length === 0 ? (
                    <EmptyState
                      icon={<GitBranch className="h-6 w-6" />}
                      title={t("wizard.stations.emptyTitle")}
                      description={t("wizard.stations.emptyDescription")}
                      action={
                        <Button className="gap-2" onClick={() => setStationDialogOpen(true)}>
                          <Plus className="h-4 w-4" />
                          {t("actions.addStation")}
                        </Button>
                      }
                    />
                  ) : (
                    <ul className="divide-y rounded-xl border">
                      {stations.map((s) => (
                        <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <MapPin className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{i18n.language.startsWith("ar") ? s.nameAr : s.nameEn}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {[s.Area?.name, s.Area?.City?.name].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          {s.licenseNumber ? <Badge variant="outline" dir="ltr">{s.licenseNumber}</Badge> : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}

              <Separator />
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button variant="ghost" onClick={() => setStep(1)} className="gap-2">
                  <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                  {t("actions.back")}
                </Button>
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  {isFuelStation && stations.length === 0 ? (
                    <Button variant="outline" onClick={() => setStep(3)}>
                      {t("actions.skip")}
                    </Button>
                  ) : null}
                  <Button onClick={() => setStep(3)} className="gap-2">
                    {t("wizard.stations.continue")}
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* ── Step 3: Company admin ──────────────────────────────── */}
        {step === 3 && org ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="h-5 w-5 text-primary" />
                {t("wizard.admin.title")}
              </CardTitle>
              <CardDescription>{t("wizard.admin.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                <span>{t("wizard.admin.companyAdminRole")}</span>
              </div>
              <CompanyUserForm
                key={`admin-form-${wizardKey}`}
                organizationId={org.id}
                defaultCompanyAdmin
                submitLabel={t("wizard.admin.submit")}
                errorHint={t("wizard.admin.retryHint")}
                formId="wizard-admin-form"
                onCancel={() => setStep(2)}
                onSaved={(user, plainPassword) => {
                  setAdmin({ user, password: plainPassword ?? "" });
                  setStep(4);
                }}
              />
            </CardContent>
          </Card>
        ) : null}

        {/* ── Step 4: Success ────────────────────────────────────── */}
        {step === 4 && org && admin ? (
          <Card className="border-emerald-200 dark:border-emerald-900">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div className="flex flex-col items-center gap-3 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <CheckCircle2 className="h-9 w-9" />
                </span>
                <h2 className="text-2xl font-bold tracking-tight">{t("wizard.success.title")}</h2>
                <p className="max-w-lg text-sm text-muted-foreground">{t("wizard.success.description")}</p>
              </div>

              <dl className="grid grid-cols-1 gap-4 rounded-xl border bg-muted/30 p-4 sm:grid-cols-2">
                <div className="sm:col-span-2 flex items-center gap-3">
                  <CompanyAvatar logoUrl={org.logoUrl} name={org.name} size="md" />
                  <div className="min-w-0">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t("wizard.success.company")}</dt>
                    <dd className="truncate text-lg font-semibold">{displayName}</dd>
                  </div>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t("wizard.success.adminLogin")}</dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <code className="rounded bg-background px-2 py-1 text-sm" dir="ltr">{admin.user.email}</code>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(admin.user.email, "email")} aria-label={t("actions.copy")}>
                      {copied === "email" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t("wizard.success.password")}</dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <code className="rounded bg-background px-2 py-1 text-sm font-mono" dir="ltr">{admin.password}</code>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(admin.password, "password")} aria-label={t("actions.copy")}>
                      {copied === "password" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t("wizard.success.stations")}</dt>
                  <dd className="mt-1 text-lg font-semibold">
                    {isFuelStation ? formatNumber(stations.length, i18n.language) : t("list.notApplicable")}
                  </dd>
                </div>
              </dl>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{t("wizard.success.passwordNote")}</AlertDescription>
              </Alert>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="ghost" asChild>
                  <Link to="/organizations">{t("wizard.success.goToList")}</Link>
                </Button>
                <Button variant="outline" onClick={resetWizard} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t("wizard.success.createAnother")}
                </Button>
                <Button onClick={() => navigate(`/organizations/${org.id}`)} className="gap-2">
                  {t("wizard.success.goToCompany")}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {createMutation.isPending ? (
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("actions.creating")}
          </p>
        ) : null}
      </div>

      {org ? (
        <StationFormDialog
          open={stationDialogOpen}
          onOpenChange={setStationDialogOpen}
          organizationId={org.id}
          station={null}
        />
      ) : null}

      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title={t("wizard.leaveTitle")}
        description={t("wizard.leaveDescription")}
        confirmLabel={t("wizard.success.goToCompany")}
        onConfirm={() => {
          setLeaveOpen(false);
          if (org) navigate(`/organizations/${org.id}`);
          else navigate("/organizations");
        }}
      />
    </div>
  );
}
