import { DashboardLoadError } from "@/components/DashboardLoadError";
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
import useGetProviderDashboard from "@/hooks/AdminDashboard/useGetProviderDashboard";
import { useChartColors } from "@/lib/chartColors";
import { formatDate, formatNumber } from "@/lib/i18n/formatters";
import { KpiCard } from "./components/KpiCard";
import { ChartCard } from "./components/ChartCard";

export default function ServiceProviderDashboard() {
  const { t, i18n } = useTranslation("dashboard");
  const colors = useChartColors();
  const { data, isLoading, error, refetch } = useGetProviderDashboard();

  const kpis = data?.kpis;
  const charts = data?.charts;

  const failedSources = data?.sources ? Object.entries(data.sources).filter(([, v]) => !v.available).length : 0;
  /** loading → "—" skeleton (isLoading), failed → "—" + unavailable note, success (incl. 0) → the number. */
  const num = (v: number | null | undefined) => (typeof v === "number" ? formatNumber(v, i18n.language) : "—");
  const unavailable = (v: number | null | undefined) => (kpis && v === null ? t("provider.unavailable") : undefined);

  const conversionRate = charts?.quoteConversion.submitted
    ? Math.round((charts.quoteConversion.accepted / charts.quoteConversion.submitted) * 100)
    : null;

  if (error && !data) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title={t("provider.title")} description={t("provider.description")} />
        <DashboardLoadError error={error} fallbackMessage={t("charts.error")} onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t("provider.title")} description={t("provider.description")} />

      {error ? <DashboardLoadError error={error} fallbackMessage={t("charts.error")} onRetry={() => refetch()} hasPreviousData /> : null}

      {failedSources > 0 ? (
        <p role="status" className="text-sm text-amber-600 dark:text-amber-400" data-testid="provider-dashboard-partial">
          {t("provider.partial", { count: failedSources })}
        </p>
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard label={t("provider.kpi.incomingRequests")} value={num(kpis?.incomingRequests.open)} icon={<Inbox className="h-5 w-5" />} to="/provider-rfqs" isLoading={isLoading} context={unavailable(kpis?.incomingRequests.open) ?? (kpis && kpis.incomingRequests.total !== null ? t("kpi.ofTotal", { total: formatNumber(kpis.incomingRequests.total, i18n.language) }) : undefined)} accent={kpis && (kpis.incomingRequests.open ?? 0) > 0 ? "warning" : "default"} />
        <KpiCard label={t("provider.kpi.awaitingMyQuote")} value={num(kpis?.awaitingMyQuote)} icon={<PlusCircle className="h-5 w-5" />} to="/provider-rfqs" isLoading={isLoading} context={unavailable(kpis?.awaitingMyQuote)} accent={kpis && (kpis.awaitingMyQuote ?? 0) > 0 ? "warning" : "default"} />
        <KpiCard label={t("provider.kpi.draftQuotes")} value={num(kpis?.draftQuotes)} icon={<FileOutput className="h-5 w-5" />} to="/provider-rfqs" isLoading={isLoading} context={unavailable(kpis?.draftQuotes)} />
        <KpiCard label={t("provider.kpi.quotesSubmitted")} value={num(kpis?.quotesSubmitted)} icon={<FileOutput className="h-5 w-5" />} to="/provider-rfqs" isLoading={isLoading} context={unavailable(kpis?.quotesSubmitted)} />
        <KpiCard label={t("provider.kpi.acceptedQuotes")} value={num(kpis?.acceptedQuotes)} icon={<CircleCheck className="h-5 w-5" />} to="/provider-rfqs" isLoading={isLoading} context={unavailable(kpis?.acceptedQuotes)} />
        <KpiCard label={t("provider.kpi.activeJobs")} value={num(kpis?.activeJobs)} icon={<ListChecks className="h-5 w-5" />} to="/provider-job-orders" isLoading={isLoading} context={unavailable(kpis?.activeJobs)} />
        <KpiCard label={t("provider.kpi.awaitingPaymentReceipt")} value={num(kpis?.awaitingPaymentReceipt)} icon={<CreditCard className="h-5 w-5" />} to="/provider-job-orders" isLoading={isLoading} context={unavailable(kpis?.awaitingPaymentReceipt)} accent={kpis && (kpis.awaitingPaymentReceipt ?? 0) > 0 ? "warning" : "default"} />
        <KpiCard label={t("provider.kpi.activeVisits")} value={num(kpis?.activeVisits)} icon={<MapPinned className="h-5 w-5" />} to="/provider-job-orders" isLoading={isLoading} context={unavailable(kpis?.activeVisits)} />
        <KpiCard label={t("provider.kpi.awaitingCompletionReport")} value={num(kpis?.awaitingCompletionReport)} icon={<ClipboardCheck className="h-5 w-5" />} to="/provider-job-orders" isLoading={isLoading} context={unavailable(kpis?.awaitingCompletionReport)} />
        <KpiCard label={t("provider.kpi.completedJobs")} value={num(kpis?.completedJobs)} icon={<CircleCheck className="h-5 w-5" />} to="/provider-job-orders" isLoading={isLoading} context={unavailable(kpis?.completedJobs)} />
        <KpiCard label={t("provider.kpi.employeesOperators")} value={kpis && kpis.employees !== null && kpis.operators !== null ? formatNumber(kpis.employees + kpis.operators, i18n.language) : "—"} icon={<Users className="h-5 w-5" />} to="/users" isLoading={isLoading} context={kpis && kpis.operators !== null ? t("provider.kpi.operatorsCount", { count: kpis.operators }) : unavailable(kpis?.employees)} />
        <KpiCard label={t("provider.kpi.services")} value={num(kpis?.services)} icon={<Wrench className="h-5 w-5" />} to="/service-categories" isLoading={isLoading} context={unavailable(kpis?.services)} />
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
          <QuickAction to="/provider-rfqs" icon={<FileOutput className="h-4 w-4" />} label={t("provider.quickActions.draftQuotes")} />
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
