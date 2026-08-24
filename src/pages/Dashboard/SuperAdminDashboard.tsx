import { useMemo } from "react";
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
  ListChecks,
  Tags,
  ArrowRight,
} from "lucide-react";
import { PageHeader, AsyncBoundary } from "@/components/patterns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import useGetAdminDashboard from "@/hooks/AdminDashboard/useGetAdminDashboard";
import useGetOrganizations from "@/hooks/Organization/useGetOrganizations";
import useGetBranchRequests from "@/hooks/BranchRequests/useGetBranchRequests";
import useGetAuditLogs from "@/hooks/Audit/useGetAuditLogs";
import { useChartColors } from "@/lib/chartColors";
import { formatDate, formatNumber } from "@/lib/i18n/formatters";
import { getApiErrorMessage } from "@/lib/utils";
import { KpiCard } from "./components/KpiCard";
import { ChartCard } from "./components/ChartCard";

export default function SuperAdminDashboard() {
  const { t, i18n } = useTranslation("dashboard");
  const colors = useChartColors();

  const { data, isLoading, error, refetch } = useGetAdminDashboard();
  const pendingOrgs = useGetOrganizations({ status: "PENDING", limit: 5 });
  const pendingBranches = useGetBranchRequests({ status: "PENDING", limit: 5 });
  const recentActivity = useGetAuditLogs(1, 6);

  const kpis = data?.kpis;
  const charts = data?.charts;

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

      {/* ── Operational queues ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">{t("queues.pendingRegistrations")}</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/organizations" className="gap-1 text-xs">
                {t("viewAll")} <ArrowRight className="h-3 w-3 rtl:rotate-180" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <AsyncBoundary isLoading={pendingOrgs.isLoading} error={pendingOrgs.error} isEmpty={!pendingOrgs.data?.data.items.length}>
              <ul className="space-y-2">
                {pendingOrgs.data?.data.items.map((org) => (
                  <li key={org.id}>
                    <Link to={`/organizations/${org.id}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/60 transition-colors">
                      <span className="flex items-center gap-2 min-w-0">
                        <Building className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate text-sm">{org.name}</span>
                      </span>
                      <Badge variant="outline" className="text-[10px] shrink-0">{t(`status.${org.status}`, { defaultValue: org.status })}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </AsyncBoundary>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">{t("queues.pendingBranches")}</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/branch-requests" className="gap-1 text-xs">
                {t("viewAll")} <ArrowRight className="h-3 w-3 rtl:rotate-180" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <AsyncBoundary isLoading={pendingBranches.isLoading} error={pendingBranches.error} isEmpty={!pendingBranches.data?.items.length}>
              <ul className="space-y-2">
                {pendingBranches.data?.items.map((branch) => (
                  <li key={branch.id}>
                    <Link to={`/branch-requests/${branch.id}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/60 transition-colors">
                      <span className="flex items-center gap-2 min-w-0">
                        <GitBranch className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate text-sm">{branch.nameEn || branch.referenceCode}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </AsyncBoundary>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">{t("queues.recentActivity")}</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/audit-log" className="gap-1 text-xs">
                {t("viewAll")} <ArrowRight className="h-3 w-3 rtl:rotate-180" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <AsyncBoundary isLoading={recentActivity.isLoading} error={recentActivity.error} isEmpty={!recentActivity.data?.items.length}>
              <ul className="space-y-2">
                {recentActivity.data?.items.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-2 px-2 py-1.5">
                    <History className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
                    <div className="min-w-0">
                      <p className="truncate text-sm">{entry.action}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {entry.User?.fullName || t("queues.system")} · {formatDate(entry.createdAt, i18n.language, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
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
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <QuickAction to="/organizations" icon={<UserPlus className="h-4 w-4" />} label={t("quickActions.reviewRegistrations")} />
          <QuickAction to="/branch-requests" icon={<GitBranch className="h-4 w-4" />} label={t("quickActions.reviewBranches")} />
          <QuickAction to="/fuel-stations" icon={<Fuel className="h-4 w-4" />} label={t("quickActions.viewFuelStations")} />
          <QuickAction to="/organizations" icon={<Briefcase className="h-4 w-4" />} label={t("quickActions.viewServiceProviders")} />
          <QuickAction to="/users" icon={<Users className="h-4 w-4" />} label={t("quickActions.viewUsers")} />
          <QuickAction to="/external-job-orders" icon={<ListChecks className="h-4 w-4" />} label={t("quickActions.viewExternalJobs")} />
          <QuickAction to="/audit-log" icon={<History className="h-4 w-4" />} label={t("quickActions.viewAuditLog")} />
          <QuickAction to="/locations" icon={<MapPinned className="h-4 w-4" />} label={t("quickActions.manageLocations")} />
          <QuickAction to="/service-categories" icon={<Tags className="h-4 w-4" />} label={t("quickActions.manageServiceCategories")} />
        </CardContent>
      </Card>
    </div>
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
