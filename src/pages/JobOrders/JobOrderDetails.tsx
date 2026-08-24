import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ChevronLeft,
    Building2,
    Calendar,
    CheckCircle2,
    PlayCircle,
    XCircle,
    FileText,
    Clock,
    MapPin,
    Hammer,
    History as HistoryIcon,
} from "lucide-react";
import useGetJobOrderById from "@/hooks/JobOrders/useGetJobOrderById";
import { formatDate, formatNumber } from "@/lib/i18n/formatters";

export default function JobOrderDetails() {
    const { t, i18n } = useTranslation("jobOrders");
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: job, isLoading, isError, error } = useGetJobOrderById(id);

    const locale = i18n.language;
    const formatDay = (value: string | null | undefined) =>
        value ? formatDate(value, locale, { dateStyle: "medium" }) : "—";
    const formatDateTime = (value: string | null | undefined) =>
        value ? formatDate(value, locale, { dateStyle: "medium", timeStyle: "short" }) : "—";

    /** Status updates are done by Service Provider on their own job order page; Fuel Station / Authority view is read-only. */
    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            COMPLETED: "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900",
            IN_PROGRESS: "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900",
            PLANNED: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900",
            PENDING: "bg-muted text-muted-foreground border-border",
            CANCELLED: "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900",
            CREATED: "bg-muted text-muted-foreground border-border",
        };
        const icons: Record<string, React.ReactNode> = {
            COMPLETED: <CheckCircle2 className="h-3 w-3" />,
            IN_PROGRESS: <PlayCircle className="h-3 w-3" />,
            PLANNED: <Calendar className="h-3 w-3" />,
            PENDING: <Clock className="h-3 w-3" />,
            CANCELLED: <XCircle className="h-3 w-3" />,
            CREATED: <Clock className="h-3 w-3" />,
        };
        const style = styles[status] ?? "bg-muted text-muted-foreground border-border";
        const icon = icons[status] ?? <Clock className="h-3 w-3" />;
        return (
            <Badge className={`${style} border shadow-none font-bold uppercase text-[10px] gap-1.5`}>
                {icon}
                {status.replace('_', ' ')}
            </Badge>
        );
    };

    const getPriorityBadge = (priority: string) => {
        const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
            URGENT: "destructive",
            HIGH: "default",
            MEDIUM: "secondary",
            LOW: "outline",
        };
        const variant = variants[priority.toUpperCase()] ?? "secondary";
        return <Badge variant={variant} className="font-bold shadow-none uppercase text-[10px] tracking-widest">{priority}</Badge>;
    };

    return (
        <div className="p-4 md:p-8">
            {isLoading || !id ? (
                <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">{t("detail.loading")}</div>
            ) : isError ? (
                <div className="space-y-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate("/job-orders")} className="gap-2">
                        <ChevronLeft className="h-4 w-4 rtl:rotate-180" /> {t("detail.backToList")}
                    </Button>
                    <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-destructive">
                        {(error as Error)?.message ?? t("detail.loadFailed")}
                    </div>
                </div>
            ) : !job ? (
                <div className="space-y-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate("/job-orders")} className="gap-2">
                        <ChevronLeft className="h-4 w-4 rtl:rotate-180" /> {t("detail.backToList")}
                    </Button>
                    <div className="rounded-lg border border-muted bg-muted/30 p-6 text-center text-muted-foreground">
                        <p className="font-medium">{t("detail.notFoundTitle")}</p>
                        <p className="text-sm mt-1">{t("detail.notFoundDescription")}</p>
                        <Link to="/job-orders" className="inline-block mt-4 text-primary hover:underline">{t("detail.returnToList")}</Link>
                    </div>
                </div>
            ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-top duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/job-orders')} className="rounded-full shadow-sm border border-transparent hover:border-border">
                        <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-black tracking-tight text-foreground">{job.title}</h1>
                            {getPriorityBadge(job.priority)}
                        </div>
                        <p className="text-muted-foreground flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold bg-muted px-2 py-0.5 rounded text-muted-foreground" dir="ltr">{job.id}</span>
                            <span className="text-muted-foreground/50">•</span>
                            {getStatusBadge(job.status)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-none shadow-sm">
                        <CardHeader className="border-b bg-muted/50 py-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                {t("detail.sections.details")}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-6">
                                <div className="p-4 rounded-xl bg-muted/50 border">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{t("detail.fields.description")}</p>
                                    <p className="text-sm font-medium text-foreground leading-relaxed">{job.description}</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                                                <Building2 className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">{t("detail.fields.serviceProvider")}</p>
                                                <p className="text-sm font-bold">{job.provider}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-purple-50 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400 flex-shrink-0">
                                                <MapPin className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">{t("detail.fields.branch")}</p>
                                                <p className="text-sm font-bold">{job.branch}</p>
                                            </div>
                                        </div>
                                        {job.fuelStationName && (
                                            <div className="flex items-start gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                                                    <Building2 className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">{t("detail.fields.fuelStation")}</p>
                                                    <p className="text-sm font-bold">{job.fuelStationName}</p>
                                                </div>
                                            </div>
                                        )}
                                        {(job.area || job.city) && (
                                            <div className="flex items-start gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-sky-50 dark:bg-sky-950 flex items-center justify-center text-sky-600 dark:text-sky-400 flex-shrink-0">
                                                    <MapPin className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">{t("detail.fields.areaCity")}</p>
                                                    <p className="text-sm font-bold">{[job.area, job.city].filter(Boolean).join(" · ") || "—"}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-green-50 dark:bg-green-950 flex items-center justify-center text-green-600 dark:text-green-400 flex-shrink-0">
                                                <Calendar className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">{t("detail.fields.startDate")}</p>
                                                <p className="text-sm font-bold">{formatDay(job.startDate)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-red-50 dark:bg-red-950 flex items-center justify-center text-red-600 dark:text-red-400 flex-shrink-0">
                                                <Calendar className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">{t("detail.fields.endDate")}</p>
                                                <p className="text-sm font-bold">{formatDay(job.endDate)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
                                                <Hammer className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">{t("detail.fields.jobType")}</p>
                                                <p className="text-sm font-bold">{job.jobType}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {job.estimatedCost != null && (
                                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{t("detail.fields.costEstimate")}</p>
                                        <p className="text-2xl font-black text-primary">{formatNumber(job.estimatedCost, locale)} SAR</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm">
                        <CardHeader className="border-b bg-muted/50 py-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <HistoryIcon className="h-5 w-5 text-primary" />
                                {t("detail.sections.timeline")}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="relative ps-6 space-y-6 before:absolute before:start-2.5 before:top-0 before:h-full before:w-px before:bg-border">
                                <div className="relative before:absolute before:-start-8 before:top-1.5 before:h-3 before:w-3 before:rounded-full before:bg-primary before:border-4 before:border-background shadow-none">
                                    <p className="text-xs font-bold text-foreground leading-none mb-1">{t("detail.timeline.created")}</p>
                                    <p className="text-[10px] text-muted-foreground font-medium">{formatDateTime(job.createdAt)}</p>
                                    <p className="text-[10px] text-muted-foreground mt-1">{t("detail.timeline.requestedBy", { name: job.requestedBy })}</p>
                                </div>
                                {job.status === 'PLANNED' && (
                                    <div className="relative before:absolute before:-start-8 before:top-1.5 before:h-3 before:w-3 before:rounded-full before:bg-amber-400 before:border-4 before:border-background shadow-none">
                                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400 leading-none mb-1">{t("detail.timeline.scheduledFor", { date: formatDay(job.startDate) })}</p>
                                    </div>
                                )}
                                {job.status === 'IN_PROGRESS' && (
                                    <div className="relative before:absolute before:-start-8 before:top-1.5 before:h-3 before:w-3 before:rounded-full before:bg-blue-500 before:border-4 before:border-background shadow-none">
                                        <p className="text-xs font-bold text-blue-700 dark:text-blue-400 leading-none mb-1">{t("detail.timeline.inProgressTitle")}</p>
                                        <p className="text-[10px] text-muted-foreground font-medium">{t("detail.timeline.inProgressDescription")}</p>
                                    </div>
                                )}
                                {job.status === 'COMPLETED' && (
                                    <div className="relative before:absolute before:-start-8 before:top-1.5 before:h-3 before:w-3 before:rounded-full before:bg-green-500 before:border-4 before:border-background shadow-none">
                                        <p className="text-xs font-bold text-green-700 dark:text-green-400 leading-none mb-1">{t("detail.timeline.completedTitle")}</p>
                                        <p className="text-[10px] text-muted-foreground font-medium">{t("detail.timeline.completedDescription", { date: formatDay(job.endDate) })}</p>
                                    </div>
                                )}
                                {(job.status === 'PLANNED' || job.status === 'PENDING') && (
                                    <div className="relative before:absolute before:-start-8 before:top-1.5 before:h-3 before:w-3 before:rounded-full before:bg-muted before:border-4 before:border-background shadow-none">
                                        <p className="text-xs leading-none mb-1 text-muted-foreground italic font-normal">{t("detail.timeline.awaiting")}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="border-none shadow-sm bg-primary/5 border border-primary/10">
                        <CardHeader>
                            <CardTitle className="text-md flex items-center gap-2">
                                <Hammer className="h-4 w-4 text-primary" />
                                {t("detail.sections.quickInfo")}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">{t("detail.fields.status")}</span>
                                <span className="text-xs font-bold">{getStatusBadge(job.status)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">{t("detail.fields.priority")}</span>
                                <span className="text-xs font-bold">{getPriorityBadge(job.priority)}</span>
                            </div>
                            {job.startDate && job.endDate && (
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground">{t("detail.fields.duration")}</span>
                                    <span className="text-xs font-bold">
                                        {t("detail.durationDays", {
                                            count: Math.ceil((new Date(job.endDate).getTime() - new Date(job.startDate).getTime()) / (1000 * 60 * 60 * 24)),
                                        })}
                                    </span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
            </div>
            )}
        </div>
    );
}
