import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import {
  Users, Wrench, Inbox, FileOutput, CircleCheck, CreditCard, MapPinned,
  ClipboardCheck, PlusCircle, UserPlus, ListChecks,
} from "lucide-react";
import { PageHeader } from "@/components/patterns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import useGetProviderDashboard from "@/hooks/AdminDashboard/useGetProviderDashboard";
import { useChartColors } from "@/lib/chartColors";
import { formatDate, formatNumber } from "@/lib/i18n/formatters";
import { getApiErrorMessage } from "@/lib/utils";
import { KpiCard } from "./components/KpiCard";
import { ChartCard } from "./components/ChartCard";

export default function ServiceProviderDashboard() {
  const { t, i18n } = useTranslation("dashboard");
  const colors = useChartColors();
  const { data, isLoading, error, refetch } = useGetProviderDashboard();

  const kpis = data?.kpis;
  const charts = data?.charts;

  const conversionRate = charts?.quoteConversion.submitted
    ? Math.round((charts.quoteConversion.accepted / charts.quoteConversion.submitted) * 100)
    : null;

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title={t("provider.title")} description={t("provider.description")} />
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
      <PageHeader title={t("provider.title")} description={t("provider.description")} />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard label={t("provider.kpi.employeesOperators")} value={kpis ? formatNumber(kpis.employees + kpis.operators, i18n.language) : "—"} icon={<Users className="h-5 w-5" />} to="/users" isLoading={isLoading} context={kpis ? t("provider.kpi.operatorsCount", { count: kpis.operators }) : undefined} />
        <KpiCard label={t("provider.kpi.services")} value={kpis ? formatNumber(kpis.services, i18n.language) : "—"} icon={<Wrench className="h-5 w-5" />} to="/service-categories" isLoading={isLoading} />
        <KpiCard label={t("provider.kpi.incomingRequests")} value={kpis ? formatNumber(kpis.incomingRequests.open, i18n.language) : "—"} icon={<Inbox className="h-5 w-5" />} to="/provider-rfqs" isLoading={isLoading} context={kpis ? t("kpi.ofTotal", { total: formatNumber(kpis.incomingRequests.total, i18n.language) }) : undefined} accent={kpis && kpis.incomingRequests.open > 0 ? "warning" : "default"} />
        <KpiCard label={t("provider.kpi.quotesSubmitted")} value={kpis ? formatNumber(kpis.quotesSubmitted, i18n.language) : "—"} icon={<FileOutput className="h-5 w-5" />} to="/provider-rfqs" isLoading={isLoading} />
        <KpiCard label={t("provider.kpi.acceptedQuotes")} value={kpis ? formatNumber(kpis.acceptedQuotes, i18n.language) : "—"} icon={<CircleCheck className="h-5 w-5" />} to="/provider-rfqs" isLoading={isLoading} />
        <KpiCard label={t("provider.kpi.activeJobs")} value={kpis ? formatNumber(kpis.activeJobs, i18n.language) : "—"} icon={<ListChecks className="h-5 w-5" />} to="/provider-job-orders" isLoading={isLoading} />
        <KpiCard label={t("provider.kpi.awaitingPaymentReceipt")} value={kpis ? formatNumber(kpis.awaitingPaymentReceipt, i18n.language) : "—"} icon={<CreditCard className="h-5 w-5" />} to="/provider-job-orders" isLoading={isLoading} accent={kpis && kpis.awaitingPaymentReceipt > 0 ? "warning" : "default"} />
        <KpiCard label={t("provider.kpi.activeVisits")} value={kpis ? formatNumber(kpis.activeVisits, i18n.language) : "—"} icon={<MapPinned className="h-5 w-5" />} to="/provider-job-orders" isLoading={isLoading} />
        <KpiCard label={t("provider.kpi.awaitingCompletionReport")} value={kpis ? formatNumber(kpis.awaitingCompletionReport, i18n.language) : "—"} icon={<ClipboardCheck className="h-5 w-5" />} to="/provider-job-orders" isLoading={isLoading} />
        <KpiCard label={t("provider.kpi.completedJobs")} value={kpis ? formatNumber(kpis.completedJobs, i18n.language) : "—"} icon={<CircleCheck className="h-5 w-5" />} to="/provider-job-orders" isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title={t("provider.charts.requestsReceivedOverTime")} isLoading={isLoading} isEmpty={!!charts && charts.requestsReceivedOverTime.every((r) => r.count === 0)}>
          <div dir="ltr">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={charts?.requestsReceivedOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: colors.axisText }} tickFormatter={(v) => formatDate(v, i18n.language, { month: "short", day: "numeric" })} />
                <YAxis tick={{ fontSize: 11, fill: colors.axisText }} allowDecimals={false} width={30} />
                <Tooltip labelFormatter={(v) => formatDate(v as string, i18n.language, { month: "short", day: "numeric", year: "numeric" })} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Line type="monotone" dataKey="count" name={t("provider.charts.requestsReceived")} stroke={colors.categorical[0]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title={t("provider.charts.quoteConversion")}
          description={conversionRate != null ? t("provider.charts.conversionRate", { rate: conversionRate }) : undefined}
          isLoading={isLoading}
          isEmpty={!charts?.quoteConversion.submitted}
        >
          <div dir="ltr">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={charts ? [{ name: t("provider.charts.submitted"), value: charts.quoteConversion.submitted }, { name: t("provider.charts.accepted"), value: charts.quoteConversion.accepted }] : []}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: colors.axisText }} />
                <YAxis tick={{ fontSize: 11, fill: colors.axisText }} allowDecimals={false} width={30} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="value" name={t("charts.count")} fill={colors.categorical[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
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
                <Bar dataKey="count" name={t("charts.count")} fill={colors.categorical[1]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title={t("provider.charts.quotesByStatus")} isLoading={isLoading} isEmpty={!charts?.quotesByStatus.length}>
          <div dir="ltr">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={charts?.quotesByStatus} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: colors.axisText }} allowDecimals={false} />
                <YAxis type="category" dataKey="status" tick={{ fontSize: 10, fill: colors.axisText }} width={110} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" name={t("charts.count")} fill={colors.categorical[2]} radius={[0, 4, 4, 0]} />
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
          <QuickAction to="/provider-rfqs" icon={<Inbox className="h-4 w-4" />} label={t("provider.quickActions.reviewIncoming")} />
          <QuickAction to="/provider-rfqs" icon={<PlusCircle className="h-4 w-4" />} label={t("provider.quickActions.createQuote")} />
          <QuickAction to="/service-categories" icon={<Wrench className="h-4 w-4" />} label={t("provider.quickActions.manageServices")} />
          <QuickAction to="/users" icon={<UserPlus className="h-4 w-4" />} label={t("provider.quickActions.addEmployee")} />
          <QuickAction to="/provider-job-orders" icon={<ListChecks className="h-4 w-4" />} label={t("provider.quickActions.activeJobs")} />
          <QuickAction to="/provider-job-orders" icon={<ClipboardCheck className="h-4 w-4" />} label={t("provider.quickActions.paymentConfirmations")} />
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
