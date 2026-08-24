import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import UsersTableCardContent from "./component/UsersTableCardContent";
import CreateUserDialog from "./component/CreateUserDialog";
import type { UserRow } from "./component/UsersTableCardContent";
import useGetUsers from "@/hooks/Users/useGetUsers";
import type { ApiUser } from "@/types/user";
import { getRoleDisplayLabel } from "@/types/user";
import { AsyncBoundary } from "@/components/patterns/AsyncBoundary";

function toUserRow(u: ApiUser): UserRow {
  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone ?? "",
    role: getRoleDisplayLabel(u) || undefined,
    roles: u.roles,
    orgName: u.organization?.name,
    status: u.isActive === false ? "INACTIVE" : "ACTIVE",
    isActive: u.isActive !== false,
  };
}

export default function Users() {
  const { t } = useTranslation("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const { data, isLoading, error } = useGetUsers();
  const users = useMemo(() => data?.data ?? [], [data?.data]);
  const rows = useMemo(() => users.map(toUserRow), [users]);
  const roleOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((u) => { if (u.role) set.add(u.role); });
    return Array.from(set).sort();
  }, [rows]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const list = q
      ? rows.filter(
        (u) =>
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          String(u.id).toLowerCase().includes(q) ||
          (u.role && u.role.toLowerCase().includes(q))
      )
      : rows;
    return roleFilter === "all" ? list : list.filter((u) => u.role === roleFilter);
  }, [rows, searchQuery, roleFilter]);

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("list.title")}</h1>
          <p className="text-muted-foreground">
            {t("list.subtitle")}
          </p>
        </div>
        <CreateUserDialog />
      </div>

      <AsyncBoundary
        isLoading={isLoading}
        error={error}
        loadingFallback={
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            {t("list.loading")}
          </div>
        }
      >
        <Card className="border-none shadow-xl bg-card/70 backdrop-blur-md">
          <CardHeader className="pb-3 px-6 pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-96">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("list.searchPlaceholder")}
                  className="ps-10 bg-background/50 border-muted-foreground/10 focus-visible:ring-primary/20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground whitespace-nowrap">
                  <Filter className="h-4 w-4" />
                  {t("list.roleLabel")}
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[180px] bg-background/50 border-muted-foreground/10">
                    <SelectValue placeholder={t("list.allRoles")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("list.allRoles")}</SelectItem>
                    {roleOptions.map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <UsersTableCardContent users={filteredUsers} />
        </Card>
      </AsyncBoundary>
    </div>
  );
}
