import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Building2, ShieldCheck, CalendarDays, Wrench, User } from "lucide-react";
import type { OrganizationMeFullData } from "@/types/organization";
import { formatDate } from "@/lib/i18n/formatters";

interface OrganizationDetailsCardProps {
    organization: OrganizationMeFullData | null | undefined;
    /** When true, render only content (Account Type, Member Since, SP summary) without Card wrapper or org header */
    embedded?: boolean;
}

function OrganizationDetailsContent({
    organization,
    t,
    locale,
}: {
    organization: OrganizationMeFullData | null | undefined;
    t: TFunction;
    locale: string;
}) {
    return (
        <div className="grid gap-6">
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-background border space-y-1">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <ShieldCheck className="h-4 w-4" />
                            <Label className="text-xs uppercase font-semibold">{t("orgDetails.accountType")}</Label>
                        </div>
                        <p className="font-medium">{organization?.type}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-background border space-y-1">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <CalendarDays className="h-4 w-4" />
                            <Label className="text-xs uppercase font-semibold">{t("orgDetails.memberSince")}</Label>
                        </div>
                        <p className="text-sm">
                            {organization?.createdAt
                                ? formatDate(organization.createdAt, locale, { year: "numeric", month: "long", day: "numeric" })
                                : "—"}
                        </p>
                    </div>
                </div>
            </div>

            {organization?.owner && (
                <div className="border-t pt-6 space-y-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" />
                        <Label className="text-xs uppercase font-semibold">{t("orgDetails.owner")}</Label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="p-3 rounded-lg bg-background border space-y-0.5">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("orgDetails.fullName")}</p>
                            <p className="font-medium">{organization.owner.fullName ?? "—"}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-background border space-y-0.5">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("orgDetails.email")}</p>
                            <p className="font-medium" dir="ltr">{organization.owner.email ?? "—"}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-background border space-y-0.5">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("orgDetails.phone")}</p>
                            <p className="font-medium" dir="ltr">{organization.owner.phone ?? "—"}</p>
                        </div>
                    </div>
                </div>
            )}

            {organization?.type === "SERVICE_PROVIDER" && organization?.ServiceProviderProfile && (
                <div className="border-t pt-6 space-y-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Wrench className="h-4 w-4" />
                        <Label className="text-xs uppercase font-semibold">{t("orgDetails.serviceProviderProfile")}</Label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="p-3 rounded-lg bg-background border space-y-0.5">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("orgDetails.licenseNumber")}</p>
                            <p className="font-medium">{organization.ServiceProviderProfile.licenseNumber ?? "—"}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-background border space-y-0.5">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("orgDetails.yearsExperience")}</p>
                            <p className="font-medium">{organization.ServiceProviderProfile.yearsExperience ?? "—"}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-background border space-y-0.5">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("orgDetails.area")}</p>
                            <p className="font-medium">{organization.ServiceProviderProfile.Area?.name ?? organization.ServiceProviderProfile.areaId ?? "—"}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-background border space-y-0.5">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("orgDetails.city")}</p>
                            <p className="font-medium">{organization.ServiceProviderProfile.City?.name ?? organization.ServiceProviderProfile.cityId ?? "—"}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-background border space-y-0.5 md:col-span-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("orgDetails.street")}</p>
                            <p className="font-medium">{organization.ServiceProviderProfile.street ?? "—"}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-background border space-y-0.5 md:col-span-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("orgDetails.serviceCategories")}</p>
                            <p className="font-medium">
                                {Array.isArray(organization.ServiceProviderProfile.serviceCategories) && organization.ServiceProviderProfile.serviceCategories.length
                                    ? organization.ServiceProviderProfile.serviceCategories.join(", ")
                                    : "—"}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function OrganizationDetailsCard({ organization, embedded }: OrganizationDetailsCardProps) {
    const { t, i18n } = useTranslation("profile");

    if (embedded) {
        return (
            <div className="space-y-6">
                <OrganizationDetailsContent organization={organization} t={t} locale={i18n.language} />
            </div>
        );
    }
    return (
        <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-card to-muted/20">
            <CardHeader className="border-b bg-muted/30 pb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <Building2 className="h-6 w-6" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-bold">{organization?.name}</CardTitle>
                            <CardDescription>{organization?.type}</CardDescription>
                        </div>
                    </div>
                    {organization?.status && (
                        <Badge className="px-3 py-1 text-xs" variant={organization.status === "APPROVED" ? "default" : "secondary"}>
                            {organization.status}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <OrganizationDetailsContent organization={organization} t={t} locale={i18n.language} />
            </CardContent>
        </Card>
    );
}
