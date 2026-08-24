import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import useGetRolePermissions from "@/hooks/Roles/useGetRolePermissions";
import useCreateRole from "@/hooks/Roles/useCreateRole";

export default function CreateCustomRole() {
    const { t } = useTranslation("roles");
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);
    const { data: permissions = [], isLoading: permissionsLoading } = useGetRolePermissions();
    const createMutation = useCreateRole();

    const permissionItems = useMemo(
        () => permissions.filter((p) => typeof p.id === "number" && p.id > 0),
        [permissions]
    );

    const handleCreateRole = (e: FormEvent) => {
        e.preventDefault();
        createMutation.mutate(
            {
                name,
                description: description || undefined,
                permissionIds: selectedPermissionIds,
            },
            {
                onSuccess: () => {
                    toast.success(t("create.createdSuccess"));
                    navigate('/roles');
                },
                onError: (err) => {
                    toast.error(err instanceof Error ? err.message : t("create.createFailed"));
                },
            }
        );
    };

    const togglePermission = (permissionId: number) => {
        setSelectedPermissionIds((prev) =>
            prev.includes(permissionId)
                ? prev.filter((id) => id !== permissionId)
                : [...prev, permissionId]
        );
    };

    return (
        <div className="p-4 md:p-8 space-y-6 animate-in slide-in-from-right duration-500 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/roles')}>
                    <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t("create.title")}</h1>
                    <p className="text-muted-foreground">{t("create.subtitle")}</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t("create.detailsTitle")}</CardTitle>
                    <CardDescription>{t("create.detailsDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form id="create-role-form" onSubmit={handleCreateRole} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="roleName">{t("create.roleName")}</Label>
                                <Input
                                    id="roleName"
                                    placeholder={t("create.roleNamePlaceholder")}
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">{t("create.description")}</Label>
                                <Textarea
                                    id="description"
                                    placeholder={t("create.descriptionPlaceholder")}
                                    className="min-h-[80px]"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-base font-semibold">{t("create.permissions")}</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                                {permissionsLoading ? (
                                    <p className="text-sm text-muted-foreground">{t("create.loadingPermissions")}</p>
                                ) : permissionItems.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">{t("create.noPermissions")}</p>
                                ) : (
                                    permissionItems.map((permission) => (
                                        <div key={permission.id} className="flex items-start gap-2">
                                            <Checkbox
                                                id={`perm-${permission.id}`}
                                                checked={selectedPermissionIds.includes(permission.id)}
                                                onCheckedChange={() => togglePermission(permission.id)}
                                            />
                                            <div className="grid gap-1.5 leading-none">
                                                <Label htmlFor={`perm-${permission.id}`} className="text-sm font-medium leading-none">
                                                    {permission.name || permission.code}
                                                </Label>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {permission.description || permission.code}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={() => navigate('/roles')}>
                                {t("create.cancel")}
                            </Button>
                            <Button type="submit" disabled={createMutation.isPending}>
                                {createMutation.isPending ? t("create.creating") : t("create.create")}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
