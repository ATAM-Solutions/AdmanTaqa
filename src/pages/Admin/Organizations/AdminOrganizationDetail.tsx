import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarDays,
  Clock,
  FileBadge,
  GitBranch,
  Pencil,
  Power,
  PowerOff,
  UserPlus,
  XCircle,
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog, EmptyState } from "@/components/patterns";
import { CompanyAvatar } from "@/components/company/CompanyAvatar";
import { ActiveBadge, OrganizationStatusBadge, OrganizationTypeBadge } from "@/components/company/CompanyBadges";
import OrganizationActions from "@/pages/Authority/Organizations/Component/OrganizationActions";
import {
  useGetAdminOrganization,
  useInvalidateAdminOrganizations,
  useSetAdminOrganizationActive,
} from "@/hooks/AdminOrganizations/useAdminOrganizations";
import { getOrganizationDisplayName } from "@/lib/company";
import { formatDate } from "@/lib/i18n/formatters";
import { getApiErrorMessage } from "@/lib/utils";
import { EditCompanyDialog } from "./components/detail/EditCompanyDialog";
import { OverviewTab } from "./components/detail/OverviewTab";
import { StationsTab } from "./components/detail/StationsTab";
import { UsersTab } from "./components/detail/UsersTab";
import { DocumentsTab } from "./components/detail/DocumentsTab";
import { ActivityTab } from "./components/detail/ActivityTab";

const TAB_KEYS = ["overview", "stations", "users", "documents", "activity"] as const;
type TabKey = (typeof TAB_KEYS)[number];

const isTabKey = (value: string | null): value is TabKey =>
  value != null && (TAB_KEYS as readonly string[]).includes(value);

function getErrorStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null)?.response?.status;
}

export default function AdminOrganizationDetail() {
  const { t, i18n } = useTranslation("adminOrganizations");
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const organizationId = id && /^\d+$/.test(id) ? Number(id) : undefined;
  const { data: organization, isLoading, error, refetch, isFetching } = useGetAdminOrganization(organizationId);
  const invalidate = useInvalidateAdminOrganizations();
  const setActiveMutation = useSetAdminOrganizationActive();

  const isFuelStation = organization?.type === "FUEL_STATION";

  // ── Tab state synced with ?tab= ──────────────────────────────────────────
  const tabParam = searchParams.get("tab");
  const activeTab: TabKey = useMemo(() => {
    const candidate: TabKey = isTabKey(tabParam) ? tabParam : "overview";
    if (candidate === "stations" && organization && !isFuelStation) return "overview";
    return candidate;
  }, [tabParam, organization, isFuelStation]);

  const setActiveTab = (next: string) => {
    if (!isTabKey(next)) return;
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next === "overview") params.delete("tab");
        else params.set("tab", next);
        return params;
      },
      { replace: true }
    );
  };

  // ── Dialog state (deep links: ?action=edit|add-station|add-user|add-admin open the
  //    matching dialog on first render; the param itself is stripped by the effect below) ──
  const [initialAction] = useState(() => searchParams.get("action"));
  const [editOpen, setEditOpen] = useState(initialAction === "edit");
  const [stationCreateOpen, setStationCreateOpen] = useState(initialAction === "add-station");
  const [userCreateOpen, setUserCreateOpen] = useState(initialAction === "add-user" || initialAction === "add-admin");
  const [userCreateAsAdmin, setUserCreateAsAdmin] = useState(initialAction === "add-admin");
  const [activeConfirmOpen, setActiveConfirmOpen] = useState(false);

  const openAddStation = () => {
    setActiveTab("stations");
    setStationCreateOpen(true);
  };
  const openAddUser = (asCompanyAdmin = false) => {
    setUserCreateAsAdmin(asCompanyAdmin);
    setActiveTab("users");
    setUserCreateOpen(true);
  };

  // ── ?action= deep links: strip the param (state was initialised from it above) ──
  const actionParam = searchParams.get("action");
  useEffect(() => {
    if (!actionParam) return;
    const params = new URLSearchParams(searchParams);
    params.delete("action");
    if (actionParam === "add-station") params.set("tab", "stations");
    if (actionParam === "add-user" || actionParam === "add-admin") params.set("tab", "users");
    setSearchParams(params, { replace: true });
  }, [actionParam, searchParams, setSearchParams]);

  // ── Activate / deactivate ────────────────────────────────────────────────
  const handleToggleActive = () => {
    if (!organization) return;
    const nextActive = !organization.isActive;
    setActiveMutation.mutate(
      { id: organization.id, isActive: nextActive },
      {
        onSuccess: () => {
          toast.success(nextActive ? t("toasts.companyActivated") : t("toasts.companyDeactivated"));
          setActiveConfirmOpen(false);
        },
        onError: (e) => toast.error(getApiErrorMessage(e, t("toasts.error"))),
      }
    );
  };

  // ── Loading / error / not found ──────────────────────────────────────────
  if (organizationId === undefined || (error && getErrorStatus(error) === 404)) {
    return (
      <div className="p-4 md:p-8">
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title={t("detail.notFound")}
          action={
            <Button asChild variant="outline">
              <Link to="/organizations" className="gap-2">
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                {t("detail.header.backToList")}
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (isLoading || (!organization && isFetching)) {
    return <DetailSkeleton />;
  }

  if (error || !organization) {
    return (
      <div className="p-4 md:p-8 space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{getApiErrorMessage(error, t("toasts.loadFailed"))}</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                {t("actions.retry")}
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <Link to="/organizations">{t("detail.header.backToList")}</Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const displayName = getOrganizationDisplayName(organization, i18n.language);
  const secondaryName =
    i18n.language.startsWith("ar") ? (organization.nameAr ? organization.name : null) : organization.nameAr;

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/organizations">{t("detail.breadcrumbRoot")}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{displayName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* ── Banners ─────────────────────────────────────────────────────── */}
      {!organization.isActive ? (
        <Alert variant="destructive">
          <PowerOff className="h-4 w-4" />
          <AlertTitle>{t("active.inactive")}</AlertTitle>
          <AlertDescription>{t("detail.header.inactiveBanner")}</AlertDescription>
        </Alert>
      ) : null}
      {organization.status === "PENDING" ? (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400">
          <Clock className="h-4 w-4" />
          <AlertTitle>{t("status.PENDING")}</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{t("detail.header.pendingBanner")}</span>
            <div className="flex flex-wrap items-center gap-2">
              <OrganizationActions
                orgId={organization.id}
                orgName={displayName}
                status={organization.status}
                variant="compact"
                onSuccess={() => invalidate(organization.id)}
              />
            </div>
          </AlertDescription>
        </Alert>
      ) : null}
      {organization.status === "REJECTED" ? (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>{t("detail.header.rejectedBanner")}</AlertTitle>
          {organization.rejectionReason ? <AlertDescription>{organization.rejectionReason}</AlertDescription> : null}
        </Alert>
      ) : null}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4 min-w-0">
          <CompanyAvatar logoUrl={organization.logoUrl} name={organization.name} size="xl" className="shadow-sm" />
          <div className="min-w-0 space-y-2">
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate" dir="auto">
                {displayName}
              </h1>
              {secondaryName ? (
                <p className="text-muted-foreground truncate" dir="auto">
                  {secondaryName}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <OrganizationTypeBadge type={organization.type} />
              <OrganizationStatusBadge status={organization.status} />
              <ActiveBadge isActive={organization.isActive} />
              {organization.registrationNumber ? (
                <Badge variant="outline" className="gap-1 font-mono font-medium" dir="ltr">
                  <FileBadge className="h-3 w-3" />
                  {t("detail.header.registrationNumber", { number: organization.registrationNumber })}
                </Badge>
              ) : null}
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              {t("detail.header.created", {
                date: formatDate(organization.createdAt, i18n.language, { dateStyle: "medium" }),
              })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Button variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            {t("actions.editCompany")}
          </Button>
          {isFuelStation ? (
            <Button variant="outline" className="gap-2" onClick={openAddStation}>
              <GitBranch className="h-4 w-4" />
              {t("actions.addStation")}
            </Button>
          ) : null}
          <Button variant="outline" className="gap-2" onClick={() => openAddUser(false)}>
            <UserPlus className="h-4 w-4" />
            {t("actions.addUser")}
          </Button>
          <Button
            variant={organization.isActive ? "destructive" : "default"}
            className="gap-2"
            onClick={() => setActiveConfirmOpen(true)}
          >
            {organization.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
            {organization.isActive ? t("actions.deactivate") : t("actions.activate")}
          </Button>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 sm:w-auto">
          <TabsTrigger value="overview">{t("detail.tabs.overview")}</TabsTrigger>
          {isFuelStation ? (
            <TabsTrigger value="stations" className="gap-1.5">
              {t("detail.tabs.stations")}
              {organization.stationsCount != null ? (
                <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">
                  {organization.stationsCount}
                </span>
              ) : null}
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="users" className="gap-1.5">
            {t("detail.tabs.users")}
            {organization.usersCount != null ? (
              <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">
                {organization.usersCount}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="documents">{t("detail.tabs.documents")}</TabsTrigger>
          <TabsTrigger value="activity">{t("detail.tabs.activity")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab organization={organization} />
        </TabsContent>
        {isFuelStation ? (
          <TabsContent value="stations">
            <StationsTab
              organization={organization}
              openCreate={stationCreateOpen}
              onOpenCreateChange={setStationCreateOpen}
            />
          </TabsContent>
        ) : null}
        <TabsContent value="users">
          <UsersTab
            organization={organization}
            openCreate={userCreateOpen}
            onOpenCreateChange={(open) => {
              setUserCreateOpen(open);
              if (!open) setUserCreateAsAdmin(false);
            }}
            createAsCompanyAdmin={userCreateAsAdmin}
          />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsTab organization={organization} />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTab organizationId={organization.id} />
        </TabsContent>
      </Tabs>

      <EditCompanyDialog open={editOpen} onOpenChange={setEditOpen} organization={organization} />

      <ConfirmDialog
        open={activeConfirmOpen}
        onOpenChange={setActiveConfirmOpen}
        title={organization.isActive ? t("confirm.deactivateCompanyTitle") : t("confirm.activateCompanyTitle")}
        description={
          organization.isActive
            ? t("confirm.deactivateCompanyDescription", { name: displayName })
            : t("confirm.activateCompanyDescription", { name: displayName })
        }
        confirmLabel={organization.isActive ? t("actions.deactivate") : t("actions.activate")}
        cancelLabel={t("actions.cancel")}
        variant={organization.isActive ? "destructive" : "default"}
        isPending={setActiveMutation.isPending}
        onConfirm={handleToggleActive}
      />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <Skeleton className="h-4 w-48" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <Skeleton className="h-24 w-24 rounded-xl" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
      <Skeleton className="h-10 w-full max-w-md" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-56 w-full lg:col-span-2" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-40 w-full lg:col-span-3" />
      </div>
    </div>
  );
}
