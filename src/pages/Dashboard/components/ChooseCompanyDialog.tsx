import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, ChevronRight, Building2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CompanyAvatar } from "@/components/company/CompanyAvatar";
import { OrganizationTypeBadge } from "@/components/company/CompanyBadges";
import { EmptyState } from "@/components/patterns";
import { useGetAdminOrganizations } from "@/hooks/AdminOrganizations/useAdminOrganizations";
import { getOrganizationDisplayName } from "@/lib/company";
import { getApiErrorMessage } from "@/lib/utils";

interface ChooseCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * "Add User" from the SUPER_ADMIN dashboard: users always belong to a company,
 * so pick the company first, then land on its Users tab with the create dialog open.
 */
export function ChooseCompanyDialog({ open, onOpenChange }: ChooseCompanyDialogProps) {
  const { t, i18n } = useTranslation("dashboard");
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { data, isLoading, error } = useGetAdminOrganizations({ limit: 50, q: q.trim() || undefined });
  const items = data?.items ?? [];

  const choose = (id: number) => {
    onOpenChange(false);
    navigate(`/organizations/${id}?tab=users&action=add-user`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("chooseCompany.title")}</DialogTitle>
          <DialogDescription>{t("chooseCompany.description")}</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("chooseCompany.searchPlaceholder")}
            className="ps-10"
          />
        </div>
        <div className="max-h-80 overflow-y-auto -mx-2 px-2">
          {isLoading ? (
            <div className="space-y-2 py-1">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{getApiErrorMessage(error, t("charts.error"))}</AlertDescription>
            </Alert>
          ) : items.length === 0 ? (
            <EmptyState icon={<Building2 className="h-6 w-6" />} title={t("chooseCompany.empty")} className="py-8" />
          ) : (
            <ul className="space-y-1">
              {items.map((org) => {
                const name = getOrganizationDisplayName(org, i18n.language);
                return (
                  <li key={org.id}>
                    <button
                      type="button"
                      onClick={() => choose(org.id)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-start hover:bg-muted/60 focus:bg-muted/60 focus:outline-none transition-colors"
                    >
                      <CompanyAvatar logoUrl={org.logoUrl} name={name} size="sm" />
                      <span className="flex-1 min-w-0">
                        <span className="block truncate text-sm font-medium" dir="auto">{name}</span>
                        {org.email ? (
                          <span className="block truncate text-xs text-muted-foreground" dir="ltr">{org.email}</span>
                        ) : null}
                      </span>
                      <OrganizationTypeBadge type={org.type} className="shrink-0 text-[10px]" />
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
