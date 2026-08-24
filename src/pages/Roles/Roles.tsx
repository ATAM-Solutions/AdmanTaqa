import RoleCardsGrid from "./Component/RoleCardsGrid";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import useGetRoles from "@/hooks/Roles/useGetRoles";
import { AsyncBoundary } from "@/components/patterns/AsyncBoundary";
import { PageHeader } from "@/components/patterns/PageHeader";

export default function Roles() {
  const { t } = useTranslation("roles");
  const navigate = useNavigate();
  const { data: roles = [], isLoading, error } = useGetRoles();

  const handleDeleteConfirm = (role: { id: string; name: string }) => {
    toast.error(t("list.deleteUnavailable", { name: role.name }));
  };

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in slide-in-from-right duration-500">
      <PageHeader
        title={t("list.title")}
        description={t("list.subtitle")}
        action={
          <Button className="gap-2 shadow-lg" onClick={() => navigate("/roles/create")}>
            <Plus className="h-4 w-4" />
            {t("list.createButton")}
          </Button>
        }
      />

      <AsyncBoundary
        isLoading={isLoading}
        error={error}
        loadingFallback={
          <div className="rounded-lg border bg-card p-8 text-sm text-muted-foreground">{t("list.loading")}</div>
        }
      >
        <RoleCardsGrid
          roles={roles.map((role) => ({
            id: String(role.id),
            name: role.name,
            description: role.description ?? "",
            permissions: role.permissions ?? [],
            permissionsList: role.permissionsList ?? [],
            userCount: role.userCount ?? 0,
            type: role.type ?? "ORGANIZATION",
          }))}
          onDeleteConfirm={handleDeleteConfirm}
        />
      </AsyncBoundary>
    </div>
  );
}
