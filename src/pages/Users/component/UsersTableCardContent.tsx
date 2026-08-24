import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MoreHorizontal, Eye, Pencil, UserX } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import EditUserDialog from "./EditUserDialog";
import DeactivateUserDialog from "./DeactivateUserDialog";
import type { UserRoleRef } from "@/types/user";

export type UserRow = {
  id: number | string;
  fullName: string;
  email: string;
  phone?: string;
  role?: string;
  roles?: UserRoleRef[];
  orgName?: string;
  status?: string;
  isActive?: boolean;
};

type UsersTableCardContentProps = {
  users: UserRow[];
};

function getRoleBadge(role?: string) {
  if (!role) return <Badge variant="secondary">—</Badge>;
  const variants: Record<string, string> = {
    ADMIN: "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900",
    AUTHORITY: "bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900",
    SERVICE_PROVIDER: "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900",
    BRANCH_MANAGER: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900",
    TECHNICIAN: "bg-muted text-muted-foreground border-border",
  };
  const label = variants[role] ? role.replace(/_/g, " ").toLowerCase() : role;
  return (
    <Badge className={`${variants[role] || "bg-muted text-muted-foreground border-muted-foreground/20"} border font-medium hover:bg-transparent shadow-none`}>
      {label}
    </Badge>
  );
}

type DropdownPlacement = { top: number; left: number; userId: string } | null;

export default function UsersTableCardContent({ users }: UsersTableCardContentProps) {
  const { t } = useTranslation("users");
  const navigate = useNavigate();
  const [dropdownPlacement, setDropdownPlacement] = useState<DropdownPlacement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const { user: currentUser, hasPermission } = useAuth();
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [deactivateUser, setDeactivateUser] = useState<UserRow | null>(null);

  useEffect(() => {
    if (!dropdownPlacement) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      )
        return;
      setDropdownPlacement(null);
      triggerRef.current = null;
    };
    const onScroll = () => setDropdownPlacement(null);
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [dropdownPlacement]);

  return (
    <CardContent className="p-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-bold text-foreground">{t("table.userName")}</TableHead>
              <TableHead className="font-bold text-foreground">{t("table.emailId")}</TableHead>
              <TableHead className="font-bold text-foreground">{t("table.role")}</TableHead>
              <TableHead className="text-end font-bold text-foreground px-6">{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  {t("table.noResults")}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/10 transition-colors border-b last:border-0 border-muted/20">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {user.fullName.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{user.fullName}</span>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className={`h-2.5 w-2.5 ${(user.status ?? "ACTIVE") === "ACTIVE" ? "text-green-500" : "text-muted-foreground"}`} />
                          {user.status ?? "ACTIVE"}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs">
                      <span className="font-medium">{user.email}</span>
                      <span className="text-muted-foreground text-[10px] font-mono" dir="ltr">{user.id}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(user.role ?? undefined)}</TableCell>
                  <TableCell className="text-end px-6 relative">
                    <div className="flex justify-end">
                      <Button
                        ref={(el) => {
                          if (dropdownPlacement?.userId === String(user.id))
                            triggerRef.current = el;
                        }}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-accent"
                        onClick={(e) => {
                          e.stopPropagation();
                          const idStr = String(user.id);
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          const isRtl = document.documentElement.dir === "rtl";
                          setDropdownPlacement(
                            dropdownPlacement?.userId === idStr
                              ? null
                              : { top: rect.bottom + 4, left: isRtl ? rect.left : rect.right - 192, userId: idStr }
                          );
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {dropdownPlacement &&
        (() => {
          const user = users.find((u) => String(u.id) === dropdownPlacement.userId);
          if (!user) return null;
          const isCurrentUser = currentUser != null && String(user.id) === String(currentUser.id);
          const canDeactivate = hasPermission("team.deactivate") && !isCurrentUser && user.isActive !== false;
          const menu = (
            <div
              ref={dropdownRef}
              className="fixed z-[100] w-48 rounded-md border bg-background shadow-lg py-1"
              style={{
                top: dropdownPlacement.top,
                left: dropdownPlacement.left,
              }}
            >
              <Button
                variant="ghost"
                className="w-full justify-start text-sm h-9 px-3 py-1"
                onClick={() => {
                  navigate(`/users/${user.id}`);
                  setDropdownPlacement(null);
                }}
              >
                <Eye className="h-3.5 w-3.5 me-2" />
                {t("menu.view")}
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-sm h-9 px-3 py-1"
                onClick={() => {
                  setEditUser(user);
                  setDropdownPlacement(null);
                }}
              >
                <Pencil className="h-3.5 w-3.5 me-2" />
                {t("menu.edit")}
              </Button>
              {canDeactivate && (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm h-9 px-3 py-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    setDeactivateUser(user);
                    setDropdownPlacement(null);
                  }}
                >
                  <UserX className="h-3.5 w-3.5 me-2" />
                  {t("menu.deactivate")}
                </Button>
              )}
            </div>
          );
          return createPortal(menu, document.body);
        })()}

      {editUser && (
        <EditUserDialog
          open={!!editUser}
          onOpenChange={(open) => { if (!open) setEditUser(null); }}
          user={{
            id: editUser.id,
            fullName: editUser.fullName,
            phone: editUser.phone,
            email: editUser.email,
            roles: editUser.roles,
          }}
        />
      )}

      <DeactivateUserDialog
        open={!!deactivateUser}
        onOpenChange={(open) => { if (!open) setDeactivateUser(null); }}
        user={deactivateUser}
      />
    </CardContent>
  );
}
