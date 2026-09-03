import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Building2,
  Fuel,
  Briefcase,
  Users,
  FileText,
  GitBranch,
  Wrench,
  ClipboardList,
  Send,
  CircleCheck,
  FileOutput,
  CreditCard,
  MapPinned,
  History,
  AlertTriangle,
  UserPlus,
  Building,
  ArrowRight,
  Store,
  UsersRound,
  PlusCircle,
  ClipboardCheck,
} from "lucide-react";
import { PageHeader, AsyncBoundary } from "@/components/patterns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import useGetAdminDashboard from "@/hooks/AdminDashboard/useGetAdminDashboard";
import useGetOrganizations from "@/hooks/Organization/useGetOrganizations";
import { useChartColors } from "@/lib/chartColors";
import { formatDate, formatNumber } from "@/lib/i18n/formatters";
import { getApiErrorMessage } from "@/lib/utils";
import { getOrganizationDisplayName } from "@/lib/company";
import { CompanyAvatar } from "@/components/company/CompanyAvatar";
import { OrganizationStatusBadge, OrganizationTypeBadge } from "@/components/company/CompanyBadges";
import { EmptyState } from "@/components/patterns";
import { KpiCard } from "./components/KpiCard";
import { ChartCard } from "./components/ChartCard";
import { ChooseCompanyDialog } from "./components/ChooseCompanyDialog";
import type { AdminDashboardRecentOrganization } from "@/types/adminDashboard";

export default function SuperAdminDashboard() {
  const { t, i18n } = useTranslation("dashboard");
  const colors = useChartColors();

  const { data, isLoading, error, refetch } = useGetAdminDashboard();
  // Fallback for the registrations panel only when the API predates `recent`.
  const pendingOrgs = useGetOrganizations({ status: "PENDING", limit: 5 });
  const [chooseCompanyOpen, setChooseCompanyOpen] = useState(false);

  const kpis = data?.kpis;
  const charts = data?.charts;
  const recent = data?.recent;
  const recentRegistrations: AdminDashboardRecentOrganization[] | undefined = recent
    ? recent.registrations
    : pendingOrgs.data?.data.items.map((org) => ({
        id: org.id,
        name: org.name,
        nameAr: org.nameAr ?? null,
        type: org.type === "SERVICE_PROVIDER" ? "SERVICE_PROVIDER" : "FUEL_STATION",
        status: org.status,
        logoUrl: org.logoUrl ?? null,
        isActive: org.isActive ?? true,
        createdAt: org.createdAt,
      }));
  const recentLoading = isLoading || (!recent && pendingOrgs.isLoading);
  const dateOpts = { month: "short", day: "numeric" } as const;

  const orgsByTypeData = useMemo(
    () =>
      Object.entries(charts?.organizationsByType ?? {}).map(([type, count]) => ({
        name: t(`orgType.${type}`, { defaultValue: type }),
        value: count,
      })),
    [charts?.organizationsByType, t]
  );

  const registrationsByStatusData = useMemo(
    () =>
      Object.entries(charts?.registrationsByStatus ?? {}).map(([status, count]) => ({
        name: t(`status.${status}`, { defaultValue: status }),
        status,
        value: count,
      })),
    [charts?.registrationsByStatus, t]
  );

  const internalVsExternalData = useMemo(
    () => [
      { name: t("charts.internal"), value: charts?.internalVsExternal.internal ?? 0 },
      { name: t("charts.external"), value: charts?.internalVsExternal.external ?? 0 },
    ],
    [charts?.internalVsExternal, t]
  );

  const statusColor = (status: string) => {
    if (status === "APPROVED") return colors.status.good;
    if (status === "PENDING") return colors.status.warning;
    if (status === "REJECTED") return colors.status.critical;
    return colors.categorical[0];
  };

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("superAdmin.title")} description={t("superAdmin.description")} />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{getApiErrorMessage(error, t("charts.error"))}</span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              {t("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t("superAdmin.title")}
        description={t("superAdmin.description")}
        action={
          <Badge className="bg-primary text-primary-foreground px-3 py-1 text-xs font-bold uppercase tracking-wide">
            {t("superAdmin.badge")}
          </Badge>
        }
      />

      {/* ── KPI cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <KpiCard
          label={t("kpi.organizations")}
          value={kpis ? formatNumber(kpis.totalOrganizations, i18n.language) : "—"}
          icon={<Building2 className="h-5 w-5" />}
          to="/organizations"
          isLoading={isLoading}
          context={
            kpis && kpis.newRegistrationsPeriod.today > 0
              ? t("kpi.newToday", { count: kpis.newRegistrationsPeriod.today })
              : undefined
          }
        />
        <KpiCard
          label={t("kpi.fuelStations")}
          value={kpis ? formatNumber(kpis.totalFuelStations, i18n.language) : "—"}
          icon={<Fuel className="h-5 w-5" />}
          to="/fuel-stations"
          isLoading={isLoading}
        />
        <KpiCard
          label={t("kpi.serviceProviders")}
          value={kpis ? formatNumber(kpis.totalServiceProviders, i18n.language) : "—"}
          icon={<Briefcase className="h-5 w-5" />}
          to="/organizations"
          isLoading={isLoading}
        />
        <KpiCard
          label={t("kpi.totalStations")}
          value={kpis ? formatNumber(kpis.totalStations ?? 0, i18n.language) : "—"}
          icon={<Store className="h-5 w-5" />}
          to="/organizations?type=FUEL_STATION"
          isLoading={isLoading}
        />
        <KpiCard
          label={t("kpi.totalUsers")}
          value={kpis ? formatNumber(kpis.totalUsers ?? 0, i18n.language) : "—"}
          icon={<UsersRound className="h-5 w-5" />}
          to="/users"
          isLoading={isLoading}
        />
        <KpiCard
          label={t("kpi.activeUsers")}
          value={kpis ? formatNumber(kpis.totalActiveUsers, i18n.language) : "—"}
          icon={<Users className="h-5 w-5" />}
          to="/users"
          isLoading={isLoading}
        />
        <KpiCard
          label={t("kpi.pendingRegistrations")}
          value={kpis ? formatNumber(kpis.pendingRegistrations, i18n.language) : "—"}
          icon={<FileText className="h-5 w-5" />}
          to="/organizations"
          isLoading={isLoading}
          accent={kpis && kpis.pendingRegistrations > 0 ? "warning" : "default"}
        />
        <KpiCard
          label={t("kpi.pendingBranches")}
          value={kpis ? formatNumber(kpis.pendingBranchApprovals, i18n.language) : "—"}
          icon={<GitBranch className="h-5 w-5" />}
          to="/branch-requests"
          isLoading={isLoading}
          accent={kpis && kpis.pendingBranchApprovals > 0 ? "warning" : "default"}
        />
        <KpiCard
          label={t("kpi.openMaintenance")}
          value={kpis ? formatNumber(kpis.openMaintenanceIssues, i18n.language) : "—"}
          icon={<Wrench className="h-5 w-5" />}
          isLoading={isLoading}
        />
        <KpiCard
          label={t("kpi.internalWorkOrders")}
          value={kpis ? formatNumber(kpis.internalWorkOrders.open, i18n.language) : "—"}
          icon={<ClipboardList className="h-5 w-5" />}
          isLoading={isLoading}
          context={kpis ? t("kpi.ofTotal", { total: formatNumber(kpis.internalWorkOrders.total, i18n.language) }) : undefined}
        />
        <KpiCard
          label={t("kpi.externalRequests")}
          value={kpis ? formatNumber(kpis.externalRequests.open, i18n.language) : "—"}
          icon={<Send className="h-5 w-5" />}
          isLoading={isLoading}
          context={kpis ? t("kpi.ofTotal", { total: formatNumber(kpis.externalRequests.total, i18n.language) }) : undefined}
        />
        <KpiCard
          label={t("kpi.activeJobs")}
          value={kpis ? formatNumber(kpis.activeJobOrders.total, i18n.language) : "—"}
          icon={<CircleCheck className="h-5 w-5" />}
          isLoading={isLoading}
        />
        <KpiCard
          label={t("kpi.completedJobs")}
          value={kpis ? formatNumber(kpis.completedJobs.total, i18n.language) : "—"}
          icon={<CircleCheck className="h-5 w-5" />}
          isLoading={isLoading}
        />
        <KpiCard
          label={t("kpi.pendingQuotations")}
          value={kpis ? formatNumber(kpis.pendingQuotations.total, i18n.language) : "—"}
          icon={<FileOutput className="h-5 w-5" />}
          isLoading={isLoading}
        />
        <KpiCard
          label={t("kpi.awaitingPayment")}
          value={kpis ? formatNumber(kpis.awaitingPaymentConfirmation.total, i18n.language) : "—"}
          icon={<CreditCard className="h-5 w-5" />}
          isLoading={isLoading}
          accent={kpis && kpis.awaitingPaymentConfirmation.total > 0 ? "warning" : "default"}
        />
        <KpiCard
          label={t("kpi.recentVisits")}
          value={kpis ? formatNumber(kpis.recentSiteVisits7d.total, i18n.language) : "—"}
          icon={<MapPinned className="h-5 w-5" />}
          isLoading={isLoading}
        />
        {kpis && kpis.stuckWorkflows.total > 0 ? (
          <KpiCard
            label={t("kpi.stuckWorkflows")}
            value={formatNumber(kpis.stuckWorkflows.total, i18n.language)}
            icon={<AlertTriangle className="h-5 w-5" />}
            isLoading={isLoading}
            accent="critical"
          />
        ) : null}
      </div>

      {/* ── Charts ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title={t("charts.requestsOverTime.title")}
          description={t("charts.requestsOverTime.description")}
          isLoading={isLoading}
          isEmpty={!!charts && charts.requestsOverTime.every((r) => r.total === 0)}
        >
          <div dir="ltr">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={charts?.requestsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: colors.axisText }} tickFormatter={(v) => formatDate(v, i18n.language, { month: "short", day: "numeric" })} />
                <YAxis tick={{ fontSize: 11, fill: colors.axisText }} allowDecimals={false} width={30} />
                <Tooltip
                  labelFormatter={(v) => formatDate(v as string, i18n.language, { month: "short", day: "numeric", year: "numeric" })}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="external" name={t("charts.external")} stroke={colors.categorical[0]} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="legacyV1" name={t("charts.legacyV1")} stroke={colors.categorical[1]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title={t("charts.jobsByStatus.title")}
          description={t("charts.jobsByStatus.description")}
          isLoading={isLoading}
          isEmpty={!charts?.jobsByStatus.length}
        >
          <div dir="ltr">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={charts?.jobsByStatus} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: colors.axisText }} allowDecimals={false} />
                <YAxis type="category" dataKey="status" tick={{ fontSize: 10, fill: colors.axisText }} width={110} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="jobOrders" name={t("charts.jobOrders")} fill={colors.categorical[0]} radius={[0, 4, 4, 0]} />
                <Bar dataKey="externalJobOrders" name={t("charts.externalJobOrders")} fill={colors.categorical[1]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title={t("charts.organizationsByType.title")}
          isLoading={isLoading}
          isEmpty={!orgsByTypeData.length}
        >
          <div dir="ltr">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={orgsByTypeData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {orgsByTypeData.map((entry, index) => (
                    <Cell key={entry.name} fill={colors.categorical[index % colors.categorical.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title={t("charts.registrationsByStatus.title")}
          isLoading={isLoading}
          isEmpty={!registrationsByStatusData.length}
        >
          <div dir="ltr">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={registrationsByStatusData}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: colors.axisText }} />
                <YAxis tick={{ fontSize: 11, fill: colors.axisText }} allowDecimals={false} width={30} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="value" name={t("charts.count")} radius={[4, 4, 0, 0]}>
                  {registrationsByStatusData.map((entry) => (
                    <Cell key={entry.name} fill={statusColor(entry.status)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title={t("charts.internalVsExternal.title")}
          isLoading={isLoading}
          isEmpty={internalVsExternalData.every((d) => d.value === 0)}
        >
          <div dir="ltr">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={internalVsExternalData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {internalVsExternalData.map((entry, index) => (
                    <Cell key={entry.name} fill={colors.categorical[index]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title={t("charts.jobCompletionTrend.title")}
          isLoading={isLoading}
          isEmpty={!!charts && charts.jobCompletionTrend.every((r) => r.completed === 0)}
        >
          <div dir="ltr">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={charts?.jobCompletionTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: colors.axisText }} tickFormatter={(v) => formatDate(v, i18n.language, { month: "short", day: "numeric" })} />
                <YAxis tick={{ fontSize: 11, fill: colors.axisText }} allowDecimals={false} width={30} />
                <Tooltip
                  labelFormatter={(v) => formatDate(v as string, i18n.language, { month: "short", day: "numeric", year: "numeric" })}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Line type="monotone" dataKey="completed" name={t("charts.completed")} stroke={colors.status.good} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title={t("charts.serviceProviderActivity.title")}
          description={t("charts.last30Days")}
          isLoading={isLoading}
          isEmpty={!charts?.serviceProviderActivity.length}
        >
          <div dir="ltr">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={charts?.serviceProviderActivity} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: colors.axisText }} allowDecimals={false} />
                <YAxis type="category" dataKey="organizationName" tick={{ fontSize: 10, fill: colors.axisText }} width={110} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" name={t("charts.quotesSubmitted")} fill={colors.categorical[2]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title={t("charts.fuelStationActivity.title")}
          description={t("charts.last30Days")}
          isLoading={isLoading}
          isEmpty={!charts?.fuelStationActivity.length}
        >
          <div dir="ltr">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={charts?.fuelStationActivity} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: colors.axisText }} allowDecimals={false} />
                <YAxis type="category" dataKey="organizationName" tick={{ fontSize: 10, fill: colors.axisText }} width={110} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" name={t("charts.requestsCreated")} fill={colors.categorical[3]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* ── Recent ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">{t("recent.organizations")}</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/organizations" className="gap-1 text-xs">
                {t("viewAll")} <ArrowRight className="h-3 w-3 rtl:rotate-180" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <AsyncBoundary
              isLoading={isLoading}
              error={error}
              isEmpty={!recent?.organizations.length}
              emptyFallback={<EmptyState icon={<Building className="h-5 w-5" />} title={t("recent.empty")} className="py-8" />}
            >
              <ul className="space-y-1">
                {recent?.organizations.map((org) => (
                  <li key={org.id}>
                    <RecentOrganizationRow org={org} name={getOrganizationDisplayName(org, i18n.language)} date={formatDate(org.createdAt, i18n.language, dateOpts)} />
                  </li>
                ))}
              </ul>
            </AsyncBoundary>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">{t("recent.users")}</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/users" className="gap-1 text-xs">
                {t("viewAll")} <ArrowRight className="h-3 w-3 rtl:rotate-180" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <AsyncBoundary
              isLoading={isLoading}
              error={error}
              isEmpty={!recent?.users.length}
              emptyFallback={<EmptyState icon={<Users className="h-5 w-5" />} title={t("recent.empty")} className="py-8" />}
            >
              <ul className="space-y-1">
                {recent?.users.map((user) => (
                  <li key={user.id}>
                    <Link
                      to={`/organizations/${user.organizationId}?tab=users`}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/60 transition-colors"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium" dir="auto">{user.fullName}</span>
                        <span className="block truncate text-xs text-muted-foreground" dir="ltr">{user.email}</span>
                        {user.organizationName ? (
                          <span className="block truncate text-xs text-muted-foreground" dir="auto">{user.organizationName}</span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatDate(user.createdAt, i18n.language, dateOpts)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </AsyncBoundary>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">{t("recent.registrations")}</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/organizations?status=PENDING" className="gap-1 text-xs">
                {t("viewAll")} <ArrowRight className="h-3 w-3 rtl:rotate-180" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <AsyncBoundary
              isLoading={recentLoading}
              error={error ?? (!recent ? pendingOrgs.error : undefined)}
              isEmpty={!recentRegistrations?.length}
              emptyFallback={<EmptyState icon={<FileText className="h-5 w-5" />} title={t("recent.empty")} className="py-8" />}
            >
              <ul className="space-y-1">
                {recentRegistrations?.map((org) => (
                  <li key={org.id}>
                    <RecentOrganizationRow org={org} name={getOrganizationDisplayName(org, i18n.language)} date={formatDate(org.createdAt, i18n.language, dateOpts)} />
                  </li>
                ))}
              </ul>
            </AsyncBoundary>
          </CardContent>
        </Card>
      </div>

      {/* ── Quick actions ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{t("quickActions.title")}</CardTitle>
          <CardDescription>{t("quickActions.description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <QuickAction to="/organizations/new?type=FUEL_STATION" icon={<Fuel className="h-4 w-4" />} label={t("quickActions.addFuelStation")} />
          <QuickAction to="/organizations/new?type=SERVICE_PROVIDER" icon={<PlusCircle className="h-4 w-4" />} label={t("quickActions.addServiceProvider")} />
          <Button variant="outline" className="h-auto justify-start gap-2 py-3" onClick={() => setChooseCompanyOpen(true)}>
            <UserPlus className="h-4 w-4" />
            <span className="text-sm font-medium">{t("quickActions.addUser")}</span>
          </Button>
          <QuickAction to="/organizations?status=PENDING" icon={<ClipboardCheck className="h-4 w-4" />} label={t("quickActions.reviewRegistrations")} />
          <QuickAction to="/organizations" icon={<Building2 className="h-4 w-4" />} label={t("quickActions.viewOrganizations")} />
          <QuickAction to="/audit-log" icon={<History className="h-4 w-4" />} label={t("quickActions.viewAuditLog")} />
        </CardContent>
      </Card>

      <ChooseCompanyDialog open={chooseCompanyOpen} onOpenChange={setChooseCompanyOpen} />
    </div>
  );
}

function RecentOrganizationRow({
  org,
  name,
  date,
}: {
  org: AdminDashboardRecentOrganization;
  name: string;
  date: string;
}) {
  return (
    <Link
      to={`/organizations/${org.id}`}
      className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/60 transition-colors"
    >
      <CompanyAvatar logoUrl={org.logoUrl} name={name} size="xs" />
      <span className="flex-1 min-w-0">
        <span className="block truncate text-sm font-medium" dir="auto">{name}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-1">
          <OrganizationTypeBadge type={org.type} className="text-[10px] px-1.5 py-0" />
          <OrganizationStatusBadge status={org.status} className="text-[10px] px-1.5 py-0" />
        </span>
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">{date}</span>
    </Link>
  );
}

function QuickAction({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Button asChild variant="outline" className="h-auto justify-start gap-2 py-3">
      <Link to={to}>
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </Link>
    </Button>
  );
}
