import { useTranslation } from "react-i18next";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Users,
    Building2,
    ClipboardList,
    ArrowUpRight,
    TrendingUp,
    Activity,
    MapPin,
    AlertCircle,
    CheckCircle2,
    DollarSign,
    Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
    const { t } = useTranslation("dashboard");

    const stats = [
        {
            titleKey: "stats.totalOrganizations",
            value: "2,482",
            change: "+12.5%",
            icon: Building2,
            color: "text-blue-600 dark:text-blue-400",
            bg: "bg-blue-50 dark:bg-blue-950",
            trend: "up",
        },
        {
            titleKey: "stats.activeUsers",
            value: "15,843",
            change: "+18.2%",
            icon: Users,
            color: "text-purple-600 dark:text-purple-400",
            bg: "bg-purple-50 dark:bg-purple-950",
            trend: "up",
        },
        {
            titleKey: "stats.openRequests",
            value: "142",
            change: "-4.5%",
            icon: ClipboardList,
            color: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-950",
            trend: "down",
        },
        {
            titleKey: "stats.revenueMtd",
            value: "$42.5k",
            change: "+8.1%",
            icon: DollarSign,
            color: "text-amber-600 dark:text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-950",
            trend: "up",
        },
    ];

    const recentActivities = [
        { id: 1, key: "branchUpdate", icon: MapPin, iconColor: "text-blue-500" },
        { id: 2, key: "newRequest", icon: AlertCircle, iconColor: "text-amber-500" },
        { id: 3, key: "autoApproved", icon: CheckCircle2, iconColor: "text-emerald-500" },
        { id: 4, key: "inspectionLogged", icon: ClipboardList, iconColor: "text-purple-500" },
    ] as const;

    const months = ["jan", "feb", "mar", "apr", "may", "jun"] as const;

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-1000">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                        {t("title")} <span className="text-primary italic">{t("titleHighlight")}</span>
                    </h1>
                    <p className="text-muted-foreground font-medium text-sm">
                        {t("subtitle")}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex -space-x-2 rtl:space-x-reverse">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                {String.fromCharCode(64 + i)}
                            </div>
                        ))}
                        <div className="h-8 w-8 rounded-full border-2 border-background bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                            +12
                        </div>
                    </div>
                    <Badge variant="secondary" className="border-none font-bold">
                        {t("networkOnline")}
                    </Badge>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <Card key={stat.titleKey} className="border-none shadow-sm hover:shadow-md transition-all cursor-default group overflow-hidden bg-card/50 backdrop-blur-sm border border-border/20">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                                {t(stat.titleKey)}
                            </CardTitle>
                            <div className={`p-2 rounded-lg ${stat.bg} ${stat.color} group-hover:rotate-12 transition-transform`}>
                                <stat.icon className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                            <div className="flex items-center mt-1">
                                <span className={`text-[10px] font-bold ${stat.trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} flex items-center`}>
                                    {stat.change}
                                    <TrendingUp className={`h-2 w-2 ms-1 ${stat.trend === 'down' ? 'rotate-180' : ''}`} />
                                </span>
                                <span className="text-[10px] text-muted-foreground font-medium ms-2 italic">{t("stats.vsLastMonth")}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Performance Chart Section */}
                <Card className="lg:col-span-2 border-none shadow-xl bg-foreground text-background overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-transparent pointer-events-none" />
                    <CardHeader className="pb-2 border-b border-background/5">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                                    {t("chart.title")}
                                </CardTitle>
                                <CardDescription className="text-background/60 text-xs">
                                    {t("chart.subtitle")}
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Badge className="bg-background/10 text-background border-none text-[10px] font-bold hover:bg-background/10">{t("chart.weekly").toUpperCase()}</Badge>
                                <Badge className="bg-primary text-primary-foreground border-none text-[10px] font-bold">{t("chart.live").toUpperCase()}</Badge>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-8 space-y-8">
                        <div className="flex items-end gap-3 h-48 md:h-64">
                            {[45, 78, 52, 94, 68, 85, 62, 75, 58, 88, 72, 91].map((h, i) => (
                                <div
                                    key={i}
                                    className="flex-1 bg-background/5 rounded-t-sm hover:bg-primary/80 transition-all cursor-pointer relative group/bar"
                                    style={{ height: `${h}%` }}
                                >
                                    <div className="absolute -top-10 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 bg-background text-foreground px-2 py-1 rounded-md text-[10px] font-black shadow-xl opacity-0 group-hover/bar:opacity-100 transition-all transform group-hover/bar:-translate-y-1">
                                        {h}%
                                    </div>
                                    {h > 80 && (
                                        <div className="absolute -bottom-1 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 w-full h-1 bg-primary blur-sm" />
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between text-[9px] font-black text-background/60 uppercase tracking-[0.3em] px-1">
                            {months.map((m) => (
                                <span key={m}>{t(`chart.months.${m}`)}</span>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Real-time Activity Section */}
                <Card className="border-none shadow-xl flex flex-col bg-card border border-border overflow-hidden">
                    <CardHeader className="pb-4 border-b bg-muted/50">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                                <Activity className="h-4 w-4 text-primary" />
                                {t("activity.title")}
                            </CardTitle>
                            <div className="flex items-center gap-1">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">{t("activity.active")}</span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-hidden">
                        <div className="divide-y max-h-[500px] overflow-y-auto scrollbar-hide">
                            {recentActivities.map((activity) => (
                                <div key={activity.id} className="p-5 hover:bg-muted/50 transition-all flex gap-4 items-start group relative">
                                    <div className={`p-2.5 rounded-xl bg-muted ${activity.iconColor} group-hover:scale-110 group-hover:-rotate-6 transition-all shadow-sm`}>
                                        <activity.icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <p className="text-sm font-bold text-foreground truncate tracking-tight">{t(`activity.items.${activity.key}.user`)}</p>
                                            <span className="text-[9px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase">{t(`activity.items.${activity.key}.time`)}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                                            {t(`activity.items.${activity.key}.action`)}{" "}
                                            <span className="text-primary font-bold hover:underline cursor-pointer italic">#{t(`activity.items.${activity.key}.target`)}</span>
                                        </p>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ArrowUpRight className="h-3 w-3 text-muted-foreground rtl:-scale-x-100" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                    <CardFooter className="p-4 border-t bg-muted/30">
                        <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary hover:bg-transparent">
                            {t("activity.loadHistorical")}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
