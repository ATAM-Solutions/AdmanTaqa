import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, ShieldAlert, Users, Lock, Pencil, Trash2 } from "lucide-react";
import type { PermissionItem } from "@/types/role";

export type RoleRow = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  permissionsList: PermissionItem[];
  userCount: number;
  type: string;
  isSystem: boolean;
  organizationType?: string;
};

type RoleCardsGridProps = {
  roles: RoleRow[];
  onDeleteConfirm?: (role: { id: string; name: string }) => void;
};

export default function RoleCardsGrid({ roles, onDeleteConfirm }: RoleCardsGridProps) {
  const { t } = useTranslation("roles");
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {roles.map((role) => (
        <Card
          key={role.id}
          className="group border-none shadow-md hover:shadow-xl transition-all flex flex-col bg-card/40 backdrop-blur-sm border border-transparent hover:border-primary/20 cursor-pointer"
          onClick={() => navigate(`/roles/${role.id}`)}
        >
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div
                className={`p-2 rounded-lg ${
                  role.type === "GLOBAL"
                    ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400"
                    : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400"
                }`}
              >
                {role.type === "GLOBAL" ? (
                  <ShieldAlert className="h-5 w-5" />
                ) : (
                  <ShieldCheck className="h-5 w-5" />
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {role.organizationType && (
                  <Badge variant="outline" className="font-medium text-[10px] tracking-wider uppercase">
                    {role.organizationType.replace("_", " ")}
                  </Badge>
                )}
                <Badge variant="secondary" className="font-medium text-[10px] tracking-wider uppercase">
                  {role.type}
                </Badge>
              </div>
            </div>
            <CardTitle className="text-lg group-hover:text-primary transition-colors">{role.name}</CardTitle>
            <CardDescription className="line-clamp-2 text-xs">{role.description}</CardDescription>
          </CardHeader>

          <CardContent className="flex-1 space-y-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <Users className="h-3.5 w-3.5" />
              {t("card.activeUsers", { count: role.userCount })}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <Lock className="h-2.5 w-2.5" />
                {t("card.permissionsHeading", { count: role.permissionsList.length || role.permissions.length })}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {(role.permissionsList.length ? role.permissionsList : role.permissions.map((code) => ({ id: 0, code, name: code })))
                  .slice(0, 8)
                  .map((perm) => (
                    <Badge
                      key={perm.id || perm.code}
                      variant="outline"
                      className="bg-background/50 text-[10px] font-normal py-0"
                      title={perm.code}
                    >
                      {perm.name ?? perm.code}
                    </Badge>
                  ))}
                {(role.permissionsList.length || role.permissions.length) > 8 && (
                  <span className="text-[10px] text-muted-foreground px-1">
                    {t("card.more", { count: (role.permissionsList.length || role.permissions.length) - 8 })}
                  </span>
                )}
              </div>
            </div>
          </CardContent>

          <CardFooter className="pt-2 border-t bg-muted/20 flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-center text-xs font-semibold hover:bg-primary/10 p-2 h-8"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/roles/${role.id}/edit`);
              }}
            >
              <Pencil className="h-3.5 w-3.5 me-2" />
              {t("card.edit")}
            </Button>
            {!role.isSystem && (
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 justify-center text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive p-2 h-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConfirm?.({ id: role.id, name: role.name });
                }}
              >
                <Trash2 className="h-3.5 w-3.5 me-2" />
                {t("card.delete")}
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
