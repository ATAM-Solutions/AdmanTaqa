import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertCircle,
  Check,
  Copy,
  Eye,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog, EmptyState } from "@/components/patterns";
import { ActiveBadge } from "@/components/company/CompanyBadges";
import { useGetAdminOrganizationUsers, useUpdateAdminUser } from "@/hooks/AdminOrganizations/useAdminUsers";
import { getInitials } from "@/lib/company";
import { formatDate } from "@/lib/i18n/formatters";
import { cn, getApiErrorMessage } from "@/lib/utils";
import type { AdminOrganizationDetail, AdminUser } from "@/types/adminOrganization";
import { CompanyUserFormDialog } from "../CompanyUserFormDialog";
import { ResetPasswordDialog } from "../ResetPasswordDialog";

interface UsersTabProps {
  organization: AdminOrganizationDetail;
  openCreate: boolean;
  onOpenCreateChange: (open: boolean) => void;
  createAsCompanyAdmin?: boolean;
}

interface CreatedCredentials {
  email: string;
  password: string;
  fullName: string;
}

export function UsersTab({ organization, openCreate, onOpenCreateChange, createAsCompanyAdmin }: UsersTabProps) {
  const { t, i18n } = useTranslation("adminOrganizations");
  const { data, isLoading, error, refetch } = useGetAdminOrganizationUsers(organization.id);
  const updateMutation = useUpdateAdminUser();

  const [search, setSearch] = useState("");
  const [viewUser, setViewUser] = useState<AdminUser | null>(null);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [resetUser, setResetUser] = useState<AdminUser | null>(null);
  const [toggleUser, setToggleUser] = useState<AdminUser | null>(null);
  /** One-time credentials of a user just created through the dialog — never persisted. */
  const [credentials, setCredentials] = useState<CreatedCredentials | null>(null);

  const users = useMemo(() => {
    const own = (data ?? []).filter((u) => u.organizationId === organization.id);
    const q = search.trim().toLowerCase();
    if (!q) return own;
    return own.filter((u) =>
      [u.fullName, u.email, u.phone, ...u.roles.map((r) => r.name)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [data, organization.id, search]);

  const hasUsers = (data ?? []).length > 0;

  const handleToggleActive = () => {
    if (!toggleUser) return;
    const nextActive = !toggleUser.isActive;
    updateMutation.mutate(
      { organizationId: organization.id, userId: toggleUser.id, body: { isActive: nextActive } },
      {
        onSuccess: () => {
          toast.success(t("toasts.userUpdated"));
          setToggleUser(null);
        },
        onError: (e) => toast.error(getApiErrorMessage(e, t("toasts.error"))),
      }
    );
  };

  return (
    <>
      {credentials ? (
        <CredentialsAlert credentials={credentials} onDismiss={() => setCredentials(null)} />
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">{t("detail.users.title")}</CardTitle>
              <CardDescription>{t("detail.users.description")}</CardDescription>
            </div>
            <Button className="gap-2" onClick={() => onOpenCreateChange(true)}>
              <UserPlus className="h-4 w-4" />
              {t("actions.addUser")}
            </Button>
          </div>
          {hasUsers ? (
            <div className="flex flex-col gap-2 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("detail.users.searchPlaceholder")}
                  className="ps-10"
                />
              </div>
              <span className="text-sm text-muted-foreground">{t("detail.users.count", { count: users.length })}</span>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error ? (
            <div className="p-6">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between gap-4">
                  <span>{getApiErrorMessage(error, t("toasts.loadFailed"))}</span>
                  <Button size="sm" variant="outline" onClick={() => refetch()}>
                    {t("actions.retry")}
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          ) : !hasUsers ? (
            <div className="p-6">
              <EmptyState
                icon={<Users className="h-6 w-6" />}
                title={t("detail.users.emptyTitle")}
                description={t("detail.users.emptyDescription")}
                action={
                  <Button className="gap-2" onClick={() => onOpenCreateChange(true)}>
                    <Plus className="h-4 w-4" />
                    {t("actions.addUser")}
                  </Button>
                }
              />
            </div>
          ) : users.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<Search className="h-6 w-6" />}
                title={t("list.emptyFilteredTitle")}
                description={t("list.emptyFilteredDescription")}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[860px]">
                <TableHeader className="bg-muted/40">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-bold text-foreground">{t("detail.users.columns.user")}</TableHead>
                    <TableHead className="font-bold text-foreground">{t("detail.users.columns.email")}</TableHead>
                    <TableHead className="font-bold text-foreground">{t("detail.users.columns.phone")}</TableHead>
                    <TableHead className="font-bold text-foreground">{t("detail.users.columns.role")}</TableHead>
                    <TableHead className="font-bold text-foreground">{t("detail.users.columns.status")}</TableHead>
                    <TableHead className="font-bold text-foreground">{t("detail.users.columns.createdAt")}</TableHead>
                    <TableHead className="text-end font-bold text-foreground">{t("detail.users.columns.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className={cn(!user.isActive && "opacity-70")}>
                      <TableCell>
                        <div className="flex items-center gap-3 min-w-0">
                          <UserInitials name={user.fullName} />
                          <span className="font-semibold text-sm truncate" dir="auto">
                            {user.fullName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm" dir="ltr">
                          {user.email}
                        </span>
                      </TableCell>
                      <TableCell>
                        {user.phone ? (
                          <span className="text-sm" dir="ltr">
                            {user.phone}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <RoleCell user={user} />
                      </TableCell>
                      <TableCell>
                        <ActiveBadge isActive={user.isActive} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(user.createdAt, i18n.language, { dateStyle: "medium" })}
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setViewUser(user)}>
                            <Eye className="h-3.5 w-3.5" />
                            {t("actions.view")}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={t("actions.manage")}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => setEditUser(user)} className="gap-2">
                                <Pencil className="h-4 w-4" />
                                {t("actions.editUser")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setResetUser(user)} className="gap-2">
                                <KeyRound className="h-4 w-4" />
                                {t("actions.resetPassword")}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={() => setToggleUser(user)}
                                className={cn("gap-2", user.isActive && "text-destructive focus:text-destructive")}
                              >
                                {user.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                {user.isActive ? t("actions.deactivate") : t("actions.activate")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create */}
      <CompanyUserFormDialog
        open={openCreate}
        onOpenChange={onOpenCreateChange}
        organizationId={organization.id}
        user={null}
        defaultCompanyAdmin={createAsCompanyAdmin}
        onSaved={(user, plainPassword) => {
          if (plainPassword) setCredentials({ email: user.email, password: plainPassword, fullName: user.fullName });
        }}
      />

      {/* Edit */}
      <CompanyUserFormDialog
        open={editUser !== null}
        onOpenChange={(open) => (!open ? setEditUser(null) : undefined)}
        organizationId={organization.id}
        user={editUser}
      />

      <ResetPasswordDialog
        open={resetUser !== null}
        onOpenChange={(open) => (!open ? setResetUser(null) : undefined)}
        organizationId={organization.id}
        user={resetUser}
      />

      <UserDetailsDialog user={viewUser} onClose={() => setViewUser(null)} />

      <ConfirmDialog
        open={toggleUser !== null}
        onOpenChange={(open) => (!open ? setToggleUser(null) : undefined)}
        title={toggleUser?.isActive ? t("confirm.deactivateUserTitle") : t("confirm.activateUserTitle")}
        description={
          toggleUser
            ? toggleUser.isActive
              ? t("confirm.deactivateUserDescription", { name: toggleUser.fullName })
              : t("confirm.activateUserDescription", { name: toggleUser.fullName })
            : undefined
        }
        confirmLabel={toggleUser?.isActive ? t("actions.deactivate") : t("actions.activate")}
        cancelLabel={t("actions.cancel")}
        variant={toggleUser?.isActive ? "destructive" : "default"}
        isPending={updateMutation.isPending}
        onConfirm={handleToggleActive}
      />
    </>
  );
}

function UserInitials({ name, size = "sm" }: { name: string; size?: "sm" | "lg" }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary",
        size === "lg" ? "h-14 w-14 text-lg" : "h-9 w-9 text-xs"
      )}
      aria-hidden
    >
      {getInitials(name)}
    </div>
  );
}

function RoleCell({ user }: { user: AdminUser }) {
  const { t } = useTranslation("adminOrganizations");
  if (user.roles.length === 0) {
    return <span className="text-sm text-muted-foreground">{t("detail.users.noRole")}</span>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {user.roles.map((role) =>
        role.isCompanyAdmin ? (
          <span key={role.id} className="inline-flex flex-col">
            <Badge className="gap-1 w-fit">
              <ShieldCheck className="h-3 w-3" />
              {t("roles.companyAdmin")}
            </Badge>
            <span className="text-[10px] text-muted-foreground ps-0.5">{role.name}</span>
          </span>
        ) : (
          <Badge key={role.id} variant="secondary" className="font-medium">
            {role.name}
          </Badge>
        )
      )}
    </div>
  );
}

/** One-time credentials banner shown right after creating a user (never persisted). */
function CredentialsAlert({ credentials, onDismiss }: { credentials: CreatedCredentials; onDismiss: () => void }) {
  const { t } = useTranslation("adminOrganizations");
  return (
    <Alert className="mb-4 border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400">
      <ShieldCheck className="h-4 w-4" />
      <AlertTitle className="flex items-start justify-between gap-2">
        <span>{t("detail.users.credentials.title")}</span>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 -mt-1 -me-1 text-current hover:bg-emerald-100 dark:hover:bg-emerald-900"
          onClick={onDismiss}
          aria-label={t("detail.users.credentials.dismiss")}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <p className="text-xs opacity-90">{t("detail.users.credentials.description")}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <CredentialField label={t("detail.users.credentials.email")} value={credentials.email} />
          <CredentialField label={t("detail.users.credentials.password")} value={credentials.password} />
        </div>
      </AlertDescription>
    </Alert>
  );
}

function CredentialField({ label, value }: { label: ReactNode; value: string }) {
  const { t } = useTranslation("adminOrganizations");
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t("toasts.error"));
    }
  };
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-emerald-200/70 bg-background/70 px-3 py-2 dark:border-emerald-900">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide opacity-70">{label}</p>
        <p className="font-mono text-sm break-all" dir="ltr">
          {value}
        </p>
      </div>
      <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => void copy()}>
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? t("detail.users.credentials.copied") : t("detail.users.credentials.copy")}
      </Button>
    </div>
  );
}

/** Read-only user details. */
function UserDetailsDialog({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  const { t, i18n } = useTranslation("adminOrganizations");
  const notSet = t("detail.users.fields.notSet");
  return (
    <Dialog open={user !== null} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-lg">
        {user ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <UserInitials name={user.fullName} size="lg" />
                <div className="min-w-0">
                  <DialogTitle className="truncate" dir="auto">
                    {user.fullName}
                  </DialogTitle>
                  <DialogDescription dir="ltr" className="truncate">
                    {user.email}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <Field label={t("detail.users.fields.fullName")} value={user.fullName} />
              <Field label={t("detail.users.fields.status")} value={<ActiveBadge isActive={user.isActive} />} />
              <Field label={t("detail.users.fields.email")} value={<span dir="ltr">{user.email}</span>} />
              <Field label={t("detail.users.fields.phone")} value={user.phone ? <span dir="ltr">{user.phone}</span> : notSet} />
              <Field label={t("detail.users.fields.roles")} value={<RoleCell user={user} />} className="sm:col-span-2" />
              <Field
                label={t("detail.users.fields.createdAt")}
                value={formatDate(user.createdAt, i18n.language, { dateStyle: "medium", timeStyle: "short" })}
              />
            </dl>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, className }: { label: ReactNode; value: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium break-words" dir="auto">
        {value}
      </dd>
    </div>
  );
}
