import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import {
  GitBranch, Users, Wrench, ClipboardList, Send, FileOutput, CircleCheck,
  CreditCard, ClipboardCheck, PlusCircle, UserPlus, ListChecks,
} from "lucide-react";
import { PageHeader } from "@/components/patterns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import useGetStationDashboard from "@/hooks/AdminDashboard/useGetStationDashboard";
import { useChartColors } from "@/lib/chartColors";
import { formatDate, formatNumber } from "@/lib/i18n/formatters";
import { getApiErrorMessage } from "@/lib/utils";
import { KpiCard } from "./components/KpiCard";
import { ChartCard } from "./components/ChartCard";

export default function FuelStationDashboard() {
  const { t, i18n } = useTranslation("dashboard");
  const colors = useChartColors();
  const { data, isLoading, error, refetch } = useGetStationDashboard();

  const kpis = data?.kpis;
  const charts = data?.charts;

  const internalVsExternalData = useMemo(
    () => [
      { name: t("charts.internal"), value: charts?.internalVsExternal.internal ?? 0 },
      { name: t("charts.external"), value: charts?.internalVsExternal.external ?? 0 },
    ],
    [charts?.internalVsExternal, t]
  );

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title={t("station.title")} description={t("station.description")} />
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
      <PageHeader title={t("station.title")} description={t("station.description")} />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard label={t("station.kpi.branches")} value={kpis ? formatNumber(kpis.branches, i18n.language) : "—"} icon={<GitBranch className="h-5 w-5" />} to="/branches" isLoading={isLoading} />
        <KpiCard label={t("station.kpi.employees")} value={kpis ? formatNumber(kpis.employees, i18n.language) : "—"} icon={<Users className="h-5 w-5" />} to="/users" isLoading={isLoading} />
        <KpiCard label={t("station.kpi.openMaintenance")} value={kpis ? formatNumber(kpis.openMaintenanceIssues, i18n.language) : "—"} icon={<Wrench className="h-5 w-5" />} isLoading={isLoading} />
        <KpiCard label={t("station.kpi.internalWorkOrders")} value={kpis ? formatNumber(kpis.internalWorkOrders.open, i18n.language) : "—"} icon={<ClipboardList className="h-5 w-5" />} to="/internal-work-orders" isLoading={isLoading} context={kpis ? t("kpi.ofTotal", { total: formatNumber(kpis.internalWorkOrders.total, i18n.language) }) : undefined} />
        <KpiCard label={t("station.kpi.externalRequests")} value={kpis ? formatNumber(kpis.externalRequests.open, i18n.language) : "—"} icon={<Send className="h-5 w-5" />} to="/station-requests" isLoading={isLoading} context={kpis ? t("kpi.ofTotal", { total: formatNumber(kpis.externalRequests.total, i18n.language) }) : undefined} />
        <KpiCard label={t("station.kpi.quotesAwaitingDecision")} value={kpis ? formatNumber(kpis.quotesAwaitingDecision, i18n.language) : "—"} icon={<FileOutput className="h-5 w-5" />} to="/station-requests" isLoading={isLoading} accent={kpis && kpis.quotesAwaitingDecision > 0 ? "warning" : "default"} />
        <KpiCard label={t("station.kpi.activeJobs")} value={kpis ? formatNumber(kpis.activeJobs, i18n.language) : "—"} icon={<CircleCheck className="h-5 w-5" />} to="/station-job-orders" isLoading={isLoading} />
        <KpiCard label={t("station.kpi.awaitingPayment")} value={kpis ? formatNumber(kpis.awaitingPayment, i18n.language) : "—"} icon={<CreditCard className="h-5 w-5" />} to="/station-job-orders" isLoading={isLoading} accent={kpis && kpis.awaitingPayment > 0 ? "warning" : "default"} />
        <KpiCard label={t("station.kpi.completedAwaitingApproval")} value={kpis ? formatNumber(kpis.completedAwaitingApproval, i18n.language) : "—"} icon={<ClipboardCheck className="h-5 w-5" />} to="/station-job-orders" isLoading={isLoading} accent={kpis && kpis.completedAwaitingApproval > 0 ? "warning" : "default"} />
        <KpiCard label={t("station.kpi.completedJobs")} value={kpis ? formatNumber(kpis.completedJobs, i18n.language) : "—"} icon={<CircleCheck className="h-5 w-5" />} to="/station-job-orders" isLoading={isLoading} />
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{t("quickActions.title")}</CardTitle>
          <CardDescription>{t("quickActions.description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <QuickAction to="/station-requests/create" icon={<PlusCircle className="h-4 w-4" />} label={t("station.quickActions.newRequest")} />
          <QuickAction to="/branches/create" icon={<GitBranch className="h-4 w-4" />} label={t("station.quickActions.addBranch")} />
          <QuickAction to="/users" icon={<UserPlus className="h-4 w-4" />} label={t("station.quickActions.addEmployee")} />
          <QuickAction to="/station-requests" icon={<FileOutput className="h-4 w-4" />} label={t("station.quickActions.reviewQuotes")} />
          <QuickAction to="/station-job-orders" icon={<ListChecks className="h-4 w-4" />} label={t("station.quickActions.activeJobs")} />
          <QuickAction to="/station-job-orders" icon={<ClipboardCheck className="h-4 w-4" />} label={t("station.quickActions.reviewCompleted")} />
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
