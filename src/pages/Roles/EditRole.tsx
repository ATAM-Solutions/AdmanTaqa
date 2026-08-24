import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Lock } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import useGetRoleById from "@/hooks/Roles/useGetRoleById";
import useGetRolePermissions from "@/hooks/Roles/useGetRolePermissions";
import useUpdateRole from "@/hooks/Roles/useUpdateRole";
import { AsyncBoundary } from "@/components/patterns/AsyncBoundary";
import { getApiErrorMessage } from "@/lib/utils";

export default function EditRole() {
    const { t } = useTranslation("roles");
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: role, isLoading, error } = useGetRoleById(id);
    const { data: permissions = [], isLoading: permissionsLoading } = useGetRolePermissions();
    const updateMutation = useUpdateRole();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);

    useEffect(() => {
        if (!role) return;
        setName(role.name ?? "");
        setDescription(role.description ?? "");
        setSelectedPermissionIds(role.permissionIds ?? []);
    }, [role]);

    const permissionItems = useMemo(
        () => permissions.filter((p) => typeof p.id === "number" && p.id > 0),
        [permissions]
    );

    const handlePermissionChange = (permissionId: number) => {
        setSelectedPermissionIds((prev) =>
            prev.includes(permissionId)
                ? prev.filter((idValue) => idValue !== permissionId)
                : [...prev, permissionId]
        );
    };

    const handleSaveRole = (e: FormEvent) => {
        e.preventDefault();
        if (!id) return;

        updateMutation.mutate(
            {
                id,
                body: {
                    name,
                    description: description || undefined,
                    permissionIds: selectedPermissionIds,
                },
            },
            {
                onSuccess: () => {
                    toast.success(t("edit.updatedSuccess", { name }));
                    navigate('/roles');
                },
                onError: (err) => {
                    toast.error(err instanceof Error ? err.message : t("edit.updateFailed"));
                },
            }
        );
    };

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
            <AsyncBoundary
                isLoading={isLoading}
                error={error ?? (!role ? new Error(t("edit.notFound")) : undefined)}
                loadingFallback={<div className="p-8 text-sm text-muted-foreground">{t("edit.loading")}</div>}
                errorFallback={
                    <div className="flex flex-col items-center justify-center p-8 text-muted-foreground gap-2">
                        <p>{getApiErrorMessage(error, t("edit.notFound"))}</p>
                        <Button variant="link" onClick={() => navigate('/roles')}>{t("edit.returnToRoles")}</Button>
                    </div>
                }
            >
                {role && (
        <div className="space-y-6 animate-in slide-in-from-right duration-500">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/roles')}>
                    <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                </Button>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-bold tracking-tight">{t("edit.title")}</h1>
                        <Badge variant={role.type === "GLOBAL" ? "default" : "secondary"} className="ms-2">
                            {role.type ?? "ORGANIZATION"}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1">{t("edit.subtitle", { name: role.name })}</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t("edit.detailsTitle")}</CardTitle>
                    <CardDescription>{t("edit.detailsDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form id="edit-role-form" onSubmit={handleSaveRole} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="roleName">{t("edit.roleName")}</Label>
                                <Input
                                    id="roleName"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t("edit.roleNamePlaceholder")}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">{t("edit.description")}</Label>
                                <Textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder={t("edit.descriptionPlaceholder")}
                                    className="min-h-[80px]"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-base font-semibold">{t("edit.permissions")}</Label>
                            <p className="text-sm text-muted-foreground">{t("edit.permissionsHint")}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                                {permissionsLoading ? (
                                    <p className="text-sm text-muted-foreground">{t("edit.loadingPermissions")}</p>
                                ) : permissionItems.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">{t("edit.noPermissions")}</p>
                                ) : (
                                    permissionItems.map((permission) => (
                                        <div key={permission.id} className="flex items-start gap-2">
                                            <Checkbox
                                                id={`perm-${permission.id}`}
                                                checked={selectedPermissionIds.includes(permission.id)}
                                                onCheckedChange={() => handlePermissionChange(permission.id)}
                                            />
                                            <div className="grid gap-1.5 leading-none">
                                                <Label htmlFor={`perm-${permission.id}`} className="text-sm font-medium leading-none flex items-center gap-1">
                                                    <Lock className="h-3 w-3" />
                                                    {permission.name || permission.code}
                                                </Label>
                                                <p className="text-[10px] text-muted-foreground">{permission.description || permission.code}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                                {t("edit.cancel")}
                            </Button>
                            <Button type="submit" disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? t("edit.saving") : t("edit.save")}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
                )}
            </AsyncBoundary>
        </div>
    );
}
