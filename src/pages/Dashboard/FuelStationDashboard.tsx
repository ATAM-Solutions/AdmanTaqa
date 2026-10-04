import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import {
  GitBranch, Users, Wrench, ClipboardList, Send, FileOutput, CircleCheck,
  CreditCard, ClipboardCheck, PlusCircle, UserPlus, ListChecks, ArrowRight,
  Store, Activity, ExternalLink, AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AsyncBoundary, EmptyState } from "@/components/patterns";
import { CompanyAvatar } from "@/components/company/CompanyAvatar";
import { ActiveBadge, OrganizationTypeBadge, StationStatusBadge } from "@/components/company/CompanyBadges";
import { useAuth } from "@/context/AuthContext";
import useGetStationDashboard from "@/hooks/AdminDashboard/useGetStationDashboard";
import { useChartColors } from "@/lib/chartColors";
import { formatDate, formatNumber } from "@/lib/i18n/formatters";
import { getApiErrorMessage } from "@/lib/utils";
import { getOrganizationDisplayName, hasCompanyAdminRole } from "@/lib/company";
import type { StationDashboardActivityItem, StationDashboardRecentStation } from "@/types/stationDashboard";
import { KpiCard } from "./components/KpiCard";
import { ChartCard } from "./components/ChartCard";

export default function FuelStationDashboard() {
  const { t, i18n } = useTranslation("dashboard");
  const colors = useChartColors();
  const { organization, roles, hasPermission } = useAuth();
  const canReadReports = hasPermission("maintenance_issues.read");
  const canCreateReport = hasPermission("maintenance_issues.create");
  const { data, isLoading, error, refetch } = useGetStationDashboard();

  const kpis = data?.kpis;
  const charts = data?.charts;
  const isArabic = i18n.language.startsWith("ar");

  // Identity: prefer the fresh server payload (logo may have just been uploaded), fall back to the auth context.
  const identity = data?.organization ?? organization;
  const displayName = getOrganizationDisplayName(identity, i18n.language);
  const logoUrl = data?.organization?.logoUrl ?? organization?.logoUrl ?? null;
  const isActive = data?.organization?.isActive ?? organization?.isActive ?? true;
  const roleLabel = hasCompanyAdminRole(roles, organization) ? t("station.roleCompanyAdmin") : roles[0]?.name;

  const internalVsExternalData = useMemo(
    () => [
      { name: t("charts.internal"), value: charts?.internalVsExternal.internal ?? 0 },
      { name: t("charts.external"), value: charts?.internalVsExternal.external ?? 0 },
    ],
    [charts?.internalVsExternal, t]
  );

  const header = (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        {identity ? (
          <CompanyAvatar logoUrl={logoUrl} name={displayName} size="lg" />
        ) : (
          <Skeleton className="h-16 w-16 rounded-xl" />
        )}
        <div className="min-w-0">
          {identity ? (
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate" dir="auto">{displayName}</h1>
          ) : (
            <Skeleton className="h-8 w-56" />
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {roleLabel ? (
              <Badge className="bg-primary text-primary-foreground px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                {roleLabel}
              </Badge>
            ) : null}
            {identity ? <OrganizationTypeBadge type={identity.type} /> : null}
            {identity ? <ActiveBadge isActive={isActive} /> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t("station.description")}</p>
        </div>
      </div>
      <Button asChild variant="outline" size="sm" className="self-start md:self-center">
        <Link to="/company" className="gap-1.5">
          <ExternalLink className="h-3.5 w-3.5" />
          {t("station.viewCompanyProfile")}
        </Link>
      </Button>
    </div>
  );

  if (error) {
    return (
      <div className="space-y-6 p-6">
        {header}
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{getApiErrorMessage(error, t("charts.error"))}</span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>{t("retry")}</Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {header}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard label={t("station.kpi.stations")} value={kpis ? formatNumber(kpis.branches, i18n.language) : "—"} icon={<Store className="h-5 w-5" />} to="/branches" isLoading={isLoading} />
        <KpiCard label={t("station.kpi.users")} value={kpis ? formatNumber(kpis.employees, i18n.language) : "—"} icon={<Users className="h-5 w-5" />} to="/users" isLoading={isLoading} />
        <KpiCard label={t("station.kpi.openMaintenanceRequests")} value={kpis ? formatNumber(kpis.openMaintenanceIssues, i18n.language) : "—"} icon={<Wrench className="h-5 w-5" />} to={canReadReports ? "/maintenance-reports" : "/station-requests"} isLoading={isLoading} />
        <KpiCard label={t("station.kpi.internalWorkOrders")} value={kpis ? formatNumber(kpis.internalWorkOrders.open, i18n.language) : "—"} icon={<ClipboardList className="h-5 w-5" />} to="/internal-work-orders" isLoading={isLoading} context={kpis ? t("kpi.ofTotal", { total: formatNumber(kpis.internalWorkOrders.total, i18n.language) }) : undefined} />
        <KpiCard label={t("station.kpi.externalRequests")} value={kpis ? formatNumber(kpis.externalRequests.open, i18n.language) : "—"} icon={<Send className="h-5 w-5" />} to="/station-requests" isLoading={isLoading} context={kpis ? t("kpi.ofTotal", { total: formatNumber(kpis.externalRequests.total, i18n.language) }) : undefined} />
        <KpiCard label={t("station.kpi.quotesAwaitingDecision")} value={kpis ? formatNumber(kpis.quotesAwaitingDecision, i18n.language) : "—"} icon={<FileOutput className="h-5 w-5" />} to="/station-requests" isLoading={isLoading} accent={kpis && kpis.quotesAwaitingDecision > 0 ? "warning" : "default"} />
        <KpiCard label={t("station.kpi.activeJobs")} value={kpis ? formatNumber(kpis.activeJobs, i18n.language) : "—"} icon={<CircleCheck className="h-5 w-5" />} to="/station-job-orders" isLoading={isLoading} />
        <KpiCard label={t("station.kpi.completedJobs")} value={kpis ? formatNumber(kpis.completedJobs, i18n.language) : "—"} icon={<ClipboardCheck className="h-5 w-5" />} to="/station-job-orders" isLoading={isLoading} />
        <KpiCard label={t("station.kpi.awaitingPayment")} value={kpis ? formatNumber(kpis.awaitingPayment, i18n.language) : "—"} icon={<CreditCard className="h-5 w-5" />} to="/station-job-orders" isLoading={isLoading} accent={kpis && kpis.awaitingPayment > 0 ? "warning" : "default"} />
        <KpiCard label={t("station.kpi.completedAwaitingApproval")} value={kpis ? formatNumber(kpis.completedAwaitingApproval, i18n.language) : "—"} icon={<ClipboardCheck className="h-5 w-5" />} to="/station-job-orders" isLoading={isLoading} accent={kpis && kpis.completedAwaitingApproval > 0 ? "warning" : "default"} />
      </div>

      {/* ── Quick actions ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{t("quickActions.title")}</CardTitle>
          <CardDescription>{t("quickActions.description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <QuickAction to="/branches/create" icon={<GitBranch className="h-4 w-4" />} label={t("station.quickActions.addStation")} />
          <QuickAction to="/users" icon={<UserPlus className="h-4 w-4" />} label={t("station.quickActions.addUser")} />
          {canCreateReport && (
            <QuickAction to="/maintenance-reports/create" icon={<ClipboardList className="h-4 w-4" />} label={t("station.quickActions.createReport")} />
          )}
          {canReadReports && (
            <QuickAction to="/maintenance-reports" icon={<ListChecks className="h-4 w-4" />} label={t("station.quickActions.viewReports")} />
          )}
          <QuickAction to="/station-requests/create" icon={<PlusCircle className="h-4 w-4" />} label={t("station.quickActions.createRequest")} />
          <QuickAction to="/station-requests" icon={<FileOutput className="h-4 w-4" />} label={t("station.quickActions.viewQuotes")} />
          <QuickAction to="/station-job-orders" icon={<ListChecks className="h-4 w-4" />} label={t("station.quickActions.viewActiveJobs")} />
        </CardContent>
      </Card>

      {/* ── Stations + recent activity ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">{t("station.panels.stations")}</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/branches" className="gap-1 text-xs">
                {t("station.panels.viewAll")} <ArrowRight className="h-3 w-3 rtl:rotate-180" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <AsyncBoundary
              isLoading={isLoading}
              isEmpty={!data?.recentStations?.length}
              emptyFallback={
                <EmptyState
                  icon={<Store className="h-6 w-6" />}
                  title={t("station.stations.emptyTitle")}
                  description={t("station.stations.empty")}
                  className="py-8"
                  action={
                    <Button asChild size="sm">
                      <Link to="/branches/create" className="gap-1.5">
                        <PlusCircle className="h-4 w-4" />
                        {t("station.quickActions.addStation")}
                      </Link>
                    </Button>
                  }
                />
              }
            >
              <ul className="divide-y">
                {data?.recentStations?.map((station) => (
                  <li key={station.id}>
                    <StationRow station={station} isArabic={isArabic} />
                  </li>
                ))}
              </ul>
            </AsyncBoundary>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">{t("station.panels.recentActivity")}</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/station-requests" className="gap-1 text-xs">
                {t("station.panels.viewAll")} <ArrowRight className="h-3 w-3 rtl:rotate-180" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <AsyncBoundary
              isLoading={isLoading}
              isEmpty={!data?.recentActivity?.length}
              emptyFallback={<EmptyState icon={<Activity className="h-6 w-6" />} title={t("station.activity.empty")} className="py-8" />}
            >
              <ul className="divide-y">
                {data?.recentActivity?.map((item) => (
                  <li key={`${item.kind}-${item.id}`}>
                    <ActivityRow
                      item={item}
                      isArabic={isArabic}
                      kindLabel={item.kind === "INTERNAL_WORK_ORDER" ? t("station.activity.internal") : t("station.activity.external")}
                      date={formatDate(item.createdAt, i18n.language, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    />
                  </li>
                ))}
              </ul>
            </AsyncBoundary>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title={t("station.charts.requestsOverTime")} isLoading={isLoading} isEmpty={!!charts && charts.requestsOverTime.every((r) => r.count === 0)}>
          <div dir="ltr">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={charts?.requestsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: colors.axisText }} tickFormatter={(v) => formatDate(v, i18n.language, { month: "short", day: "numeric" })} />
                <YAxis tick={{ fontSize: 11, fill: colors.axisText }} allowDecimals={false} width={30} />
                <Tooltip labelFormatter={(v) => formatDate(v as string, i18n.language, { month: "short", day: "numeric", year: "numeric" })} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Line type="monotone" dataKey="count" name={t("charts.requestsCreated")} stroke={colors.categorical[0]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title={t("charts.internalVsExternal.title")} isLoading={isLoading} isEmpty={internalVsExternalData.every((d) => d.value === 0)}>
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

        <ChartCard title={t("charts.jobsByStatus.title")} isLoading={isLoading} isEmpty={!charts?.jobsByStatus.length}>
          <div dir="ltr">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={charts?.jobsByStatus} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: colors.axisText }} allowDecimals={false} />
                <YAxis type="category" dataKey="status" tick={{ fontSize: 10, fill: colors.axisText }} width={110} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" name={t("charts.count")} fill={colors.categorical[0]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title={t("station.charts.branchActivity")} isLoading={isLoading} isEmpty={!charts?.branchActivity.length}>
          <div dir="ltr">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={charts?.branchActivity} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: colors.axisText }} allowDecimals={false} />
                <YAxis type="category" dataKey="branchName" tick={{ fontSize: 10, fill: colors.axisText }} width={110} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" name={t("charts.requestsCreated")} fill={colors.categorical[2]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title={t("station.charts.providerUsage")} isLoading={isLoading} isEmpty={!charts?.providerUsage.length} className="lg:col-span-2">
          <div dir="ltr">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={charts?.providerUsage} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: colors.axisText }} allowDecimals={false} />
                <YAxis type="category" dataKey="organizationName" tick={{ fontSize: 10, fill: colors.axisText }} width={140} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" name={t("charts.quotesSubmitted")} fill={colors.categorical[3]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function StationRow({ station, isArabic }: { station: StationDashboardRecentStation; isArabic: boolean }) {
  const name = (isArabic ? station.nameAr : station.nameEn) || station.nameEn || station.nameAr;
  return (
    <Link to={`/branches/${station.id}`} className="flex items-center justify-between gap-3 px-1 py-2.5 hover:bg-muted/60 rounded-lg transition-colors">
      <span className="flex items-center gap-3 min-w-0">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Store className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium" dir="auto">{name}</span>
          <span className="block truncate text-xs text-muted-foreground" dir="auto">
            {station.Area?.name ?? station.address ?? (station.licenseNumber ? <span dir="ltr">{station.licenseNumber}</span> : null)}
          </span>
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        {station.isActive ? <StationStatusBadge status={station.status} className="text-[10px] px-1.5 py-0" /> : <ActiveBadge isActive={false} className="text-[10px] px-1.5 py-0" />}
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground rtl:rotate-180" />
      </span>
    </Link>
  );
}

function ActivityRow({
  item,
  isArabic,
  kindLabel,
  date,
}: {
  item: StationDashboardActivityItem;
  isArabic: boolean;
  kindLabel: string;
  date: string;
}) {
  const to = item.kind === "INTERNAL_WORK_ORDER" ? `/internal-work-orders/${item.id}` : `/station-requests/${item.id}`;
  const title = (isArabic ? item.titleAr : null) || item.title || `#${item.id}`;
  const branch = item.branch ? ((isArabic ? item.branch.nameAr : item.branch.nameEn) || item.branch.nameEn) : null;
  return (
    <Link to={to} className="flex items-start justify-between gap-3 px-1 py-2.5 hover:bg-muted/60 rounded-lg transition-colors">
      <span className="flex items-start gap-3 min-w-0">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {item.kind === "INTERNAL_WORK_ORDER" ? <ClipboardList className="h-4 w-4" /> : <Send className="h-4 w-4" />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium" dir="auto">{title}</span>
          <span className="block truncate text-xs text-muted-foreground" dir="auto">
            {kindLabel}
            {branch ? ` · ${branch}` : ""}
            {` · ${date}`}
          </span>
        </span>
      </span>
      <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 font-mono" dir="ltr">
        {item.status}
      </Badge>
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
