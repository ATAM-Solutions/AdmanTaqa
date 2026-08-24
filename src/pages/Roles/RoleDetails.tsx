import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ShieldCheck,
    ShieldAlert,
    Users,
    Settings2,
    ChevronLeft,
    Lock,
    History
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import useGetRoleById from "@/hooks/Roles/useGetRoleById";
import { AsyncBoundary } from "@/components/patterns/AsyncBoundary";
import { getApiErrorMessage } from "@/lib/utils";

export default function RoleDetails() {
    const { t } = useTranslation("roles");
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: role, isLoading, error } = useGetRoleById(id);

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
            <AsyncBoundary
                isLoading={isLoading}
                error={error ?? (!role ? new Error(t("details.notFound")) : undefined)}
                loadingFallback={<div className="p-8 text-sm text-muted-foreground">{t("details.loading")}</div>}
                errorFallback={
                    <div className="flex flex-col items-center justify-center p-8 text-muted-foreground gap-2">
                        <p>{getApiErrorMessage(error, t("details.notFound"))}</p>
                        <Button variant="link" onClick={() => navigate('/roles')}>{t("details.returnToRoles")}</Button>
                    </div>
                }
            >
                {role && (
        <div className="space-y-6 animate-in slide-in-from-right duration-500">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/roles')}>
                    <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                </Button>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-bold tracking-tight">{role.name}</h1>
                        <Badge variant={role.type === "GLOBAL" ? "default" : "secondary"} className="ms-2">
                            {role.type ?? "ORGANIZATION"}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1">{role.description}</p>
                </div>
                <div className="ms-auto flex gap-2">
                    <Button variant="outline" onClick={() => navigate(`/roles/${String(role.id)}/edit`)}>
                        <Settings2 className="h-4 w-4 me-2" />
                        {t("details.editRole")}
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Main Details */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>{t("details.permissionsTitle")}</CardTitle>
                        <CardDescription>{t("details.permissionsDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {(role.permissionsList?.length ? role.permissionsList : role.permissions.map((code) => ({ id: 0, code, name: code }))).map((perm) => (
                                <Badge key={perm.id || perm.code} variant="outline" className="px-3 py-1 flex items-center gap-1" title={perm.code}>
                                    <Lock className="h-3 w-3" />
                                    {perm.name ?? perm.code}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Stats / Info */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">{t("details.overview")}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Users className="h-4 w-4" />
                                    {t("details.activeUsers")}
                                </div>
                                <span className="font-bold text-lg">{role.userCount ?? 0}</span>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <History className="h-4 w-4" />
                                    {t("details.createdAt")}
                                </div>
                                <span className="text-sm font-medium">{role.createdAt ?? t("details.notAvailable")}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card
                        className={`border-s-4 ${
                            role.type === 'GLOBAL'
                                ? 'border-s-purple-500 dark:border-s-purple-600'
                                : 'border-s-blue-500 dark:border-s-blue-600'
                        }`}
                    >
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                {role.type === 'GLOBAL' ? <ShieldAlert className="h-4 w-4 text-purple-600 dark:text-purple-400" /> : <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                                {t("details.roleType")}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{role.type}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {role.type === 'GLOBAL' ? t("details.globalDescription") : t("details.orgDescription")}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
                )}
            </AsyncBoundary>
        </div>
    );
}
