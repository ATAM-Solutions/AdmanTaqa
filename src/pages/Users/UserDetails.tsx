import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  Mail,
  Phone,
  User,
  Shield,
  Building2,
  Pencil,
  UserX,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import useGetUserById from "@/hooks/Users/useGetUserById";
import { getRoleDisplayLabel } from "@/types/user";
import EditUserDialog from "./component/EditUserDialog";
import DeactivateUserDialog from "./component/DeactivateUserDialog";
import { AsyncBoundary } from "@/components/patterns/AsyncBoundary";

function getRoleBadge(role?: string) {
  if (!role) return <Badge variant="secondary">—</Badge>;
  const variants: Record<string, string> = {
    ADMIN: "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900",
    AUTHORITY: "bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900",
    SERVICE_PROVIDER: "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900",
    BRANCH_MANAGER: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900",
    TECHNICIAN: "bg-muted text-muted-foreground border-border",
  };
  const label = variants[role] ? role.replace(/_/g, " ") : role;
  return (
    <Badge className={`${variants[role] || "bg-muted text-muted-foreground border-muted-foreground/20"} border font-bold shadow-none text-[10px] tracking-wide`}>
      {label}
    </Badge>
  );
}

export default function UserDetails() {
  const { t } = useTranslation("users");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser, hasPermission } = useAuth();
  const { data: user, isLoading, error } = useGetUserById(id);
  const status = user?.isActive === false ? "INACTIVE" : "ACTIVE";
  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const isCurrentUser = currentUser != null && user && String(user.id) === String(currentUser.id);
  const canDeactivate = hasPermission("team.deactivate") && !isCurrentUser && user?.isActive !== false;

  return (
    <div className="p-4 md:p-8">
      <AsyncBoundary
        isLoading={isLoading || !id}
        error={error ?? (!user ? new Error(t("details.notFound")) : undefined)}
        loadingFallback={
          <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
            {t("details.loading")}
          </div>
        }
        errorFallback={
          <>
            <Button variant="ghost" onClick={() => navigate("/users")} className="mb-4">
              <ChevronLeft className="h-4 w-4 me-2 rtl:rotate-180" /> {t("details.back")}
            </Button>
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-destructive">
              {t("details.notFound")}
            </div>
          </>
        }
      >
        {user && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/users')} className="rounded-full shadow-sm border border-transparent hover:border-border">
                        <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
                    </Button>
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl shadow-inner">
                            {user.fullName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-3xl font-black tracking-tight text-foreground">{user.fullName}</h1>
                                <Badge variant={status === "ACTIVE" ? "default" : "secondary"} className={`shadow-none font-bold text-[10px] ${status === "ACTIVE" ? "bg-green-600 hover:bg-green-600 dark:bg-green-700 dark:hover:bg-green-700" : ""}`}>
                                    {status}
                                </Badge>
                            </div>
                            <p className="text-muted-foreground flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-muted-foreground" dir="ltr">{user.id}</span>
                                <span className="text-muted-foreground/40">•</span>
                                {getRoleBadge(getRoleDisplayLabel(user))}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" className="gap-2 shadow-sm" onClick={() => setEditOpen(true)}>
                        <Pencil className="h-4 w-4" />
                        {t("details.edit")}
                    </Button>
                    {canDeactivate && (
                      <Button variant="destructive" className="gap-2 shadow-lg" onClick={() => setDeactivateOpen(true)}>
                        <UserX className="h-4 w-4" />
                        {t("details.deactivate")}
                      </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-none shadow-sm">
                        <CardHeader className="border-b bg-muted/50 py-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <User className="h-5 w-5 text-primary" />
                                {t("details.personalInfo")}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="group p-3 rounded-xl hover:bg-muted/50 transition-colors">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                            <Mail className="h-3 w-3" />
                                            {t("details.emailAddress")}
                                        </p>
                                        <p className="text-sm font-bold text-foreground" dir="ltr">{user.email}</p>
                                    </div>
                                    <div className="group p-3 rounded-xl hover:bg-muted/50 transition-colors">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                            <Phone className="h-3 w-3" />
                                            {t("details.contactNumber")}
                                        </p>
                                        <p className="text-sm font-bold text-foreground" dir="ltr">{user.phone ?? "—"}</p>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="group p-3 rounded-xl hover:bg-muted/50 transition-colors">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                            <Building2 className="h-3 w-3" />
                                            {t("details.organization")}
                                        </p>
                                        <p className="text-sm font-bold text-foreground">{user.organization?.name ?? "—"}</p>
                                    </div>
                                    <div className="group p-3 rounded-xl hover:bg-muted/50 transition-colors">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                            <Shield className="h-3 w-3" />
                                            {t("details.accessLevel")}
                                        </p>
                                        <div>{getRoleBadge(getRoleDisplayLabel(user))}</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </div>

            </div>

            <EditUserDialog
              open={editOpen}
              onOpenChange={setEditOpen}
              user={{
                id: user.id,
                fullName: user.fullName,
                phone: user.phone,
                email: user.email,
                roles: user.roles,
              }}
            />

            <DeactivateUserDialog
              open={deactivateOpen}
              onOpenChange={setDeactivateOpen}
              user={{ id: user.id, fullName: user.fullName }}
            />
        </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
