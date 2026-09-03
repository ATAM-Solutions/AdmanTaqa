import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  Building2,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, ConfirmDialog, EmptyState } from "@/components/patterns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import TablePagination from "@/components/TablePagination";
import { CompanyAvatar } from "@/components/company/CompanyAvatar";
import { ActiveBadge, OrganizationStatusBadge, OrganizationTypeBadge } from "@/components/company/CompanyBadges";
import OrganizationActions from "@/pages/Authority/Organizations/Component/OrganizationActions";
import {
  useGetAdminOrganizations,
  useInvalidateAdminOrganizations,
  useSetAdminOrganizationActive,
} from "@/hooks/AdminOrganizations/useAdminOrganizations";
import { formatDate, formatNumber } from "@/lib/i18n/formatters";
import { getOrganizationDisplayName } from "@/lib/company";
import { getApiErrorMessage, cn } from "@/lib/utils";
import type { AdminOrganization, AdminOrganizationsListParams } from "@/types/adminOrganization";

const PAGE_SIZE = 20;

type FilterKey = "all" | "fuelStations" | "serviceProviders" | "pending" | "approved" | "active" | "inactive";

const FILTERS: { key: FilterKey; params: Partial<AdminOrganizationsListParams> }[] = [
  { key: "all", params: {} },
  { key: "fuelStations", params: { type: "FUEL_STATION" } },
  { key: "serviceProviders", params: { type: "SERVICE_PROVIDER" } },
  { key: "pending", params: { status: "PENDING" } },
  { key: "approved", params: { status: "APPROVED" } },
  { key: "active", params: { isActive: true } },
  { key: "inactive", params: { isActive: false } },
];

function paramsFromSearch(sp: URLSearchParams): AdminOrganizationsListParams {
  const type = sp.get("type");
  const status = sp.get("status");
  const isActive = sp.get("isActive");
  const page = Number(sp.get("page") ?? "1");
  return {
    type: type === "FUEL_STATION" || type === "SERVICE_PROVIDER" ? type : undefined,
    status: status === "PENDING" || status === "APPROVED" || status === "REJECTED" ? status : undefined,
    isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
    q: sp.get("q") ?? undefined,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: PAGE_SIZE,
  };
}

function activeFilter(p: AdminOrganizationsListParams): FilterKey {
  if (p.type === "FUEL_STATION") return "fuelStations";
  if (p.type === "SERVICE_PROVIDER") return "serviceProviders";
  if (p.status === "PENDING") return "pending";
  if (p.status === "APPROVED") return "approved";
  if (p.isActive === true) return "active";
  if (p.isActive === false) return "inactive";
  return "all";
}

export default function AdminOrganizations() {
  const { t, i18n } = useTranslation("adminOrganizations");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => paramsFromSearch(searchParams), [searchParams]);
  const filter = activeFilter(params);

  // Debounced search → q param
  const [search, setSearch] = useState(params.q ?? "");
  useEffect(() => setSearch(params.q ?? ""), [params.q]);
  useEffect(() => {
    const handle = window.setTimeout(() => {
      const current = searchParams.get("q") ?? "";
      if (search.trim() === current) return;
      const next = new URLSearchParams(searchParams);
      if (search.trim()) next.set("q", search.trim());
      else next.delete("q");
      next.delete("page");
      setSearchParams(next, { replace: true });
    }, 300);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const setFilter = (key: FilterKey) => {
    const next = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) next.set("q", q);
    const f = FILTERS.find((x) => x.key === key)?.params ?? {};
    if (f.type) next.set("type", f.type);
    if (f.status) next.set("status", f.status);
    if (f.isActive !== undefined) next.set("isActive", String(f.isActive));
    setSearchParams(next);
  };

  const setPage = (page: number) => {
    const next = new URLSearchParams(searchParams);
    if (page > 1) next.set("page", String(page));
    else next.delete("page");
    setSearchParams(next);
  };

  const { data, isLoading, isFetching, error, refetch } = useGetAdminOrganizations(params);
  const invalidate = useInvalidateAdminOrganizations();
  const setActive = useSetAdminOrganizationActive();
  const [pendingToggle, setPendingToggle] = useState<AdminOrganization | null>(null);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = filter !== "all" || !!params.q;

  const confirmToggle = () => {
    if (!pendingToggle) return;
    const target = pendingToggle;
    const nextActive = !target.isActive;
    setActive.mutate(
      { id: target.id, isActive: nextActive },
      {
        onSuccess: () => {
          toast.success(nextActive ? t("toasts.companyActivated") : t("toasts.companyDeactivated"));
          setPendingToggle(null);
        },
        onError: (err) => toast.error(getApiErrorMessage(err, t("toasts.error"))),
      }
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title={t("list.title")}
        description={t("list.subtitle")}
        action={
          <Button onClick={() => navigate("/organizations/new")} className="gap-2 shadow-lg">
            <Plus className="h-4 w-4" />
            {t("actions.addCompany")}
          </Button>
        }
      />

      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-0">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("list.searchPlaceholder")}
                  className="ps-10 bg-background/50"
                />
              </div>
              <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                {isLoading ? <Skeleton className="h-4 w-24" /> : t("list.count", { count: total })}
              </div>
            </div>
            <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("list.filters.label")}>
              {FILTERS.map((f) => (
                <Button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.key}
                  size="sm"
                  variant={filter === f.key ? "default" : "outline"}
                  className={cn("rounded-full", filter === f.key ? "shadow" : "")}
                  onClick={() => setFilter(f.key)}
                >
                  {t(`list.filters.${f.key}`)}
                </Button>
              ))}
            </div>
          </div>

          {error ? (
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
          ) : !isLoading && items.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<Building2 className="h-6 w-6" />}
                title={hasFilters ? t("list.emptyFilteredTitle") : t("list.emptyTitle")}
                description={hasFilters ? t("list.emptyFilteredDescription") : t("list.emptyDescription")}
                action={
                  hasFilters ? (
                    <Button variant="outline" onClick={() => { setSearch(""); setSearchParams(new URLSearchParams()); }}>
                      {t("list.filters.all")}
                    </Button>
                  ) : (
                    <Button onClick={() => navigate("/organizations/new")} className="gap-2">
                      <Plus className="h-4 w-4" />
                      {t("actions.addCompany")}
                    </Button>
                  )
                }
              />
            </div>
          ) : (
            <>
              <div className={cn("w-full overflow-x-auto", isFetching && !isLoading ? "opacity-70 transition-opacity" : "")}>
                <Table className="min-w-[900px]">
                  <TableHeader className="bg-muted/40">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-14 font-bold text-foreground">{t("list.columns.logo")}</TableHead>
                      <TableHead className="font-bold text-foreground">{t("list.columns.organization")}</TableHead>
                      <TableHead className="font-bold text-foreground">{t("list.columns.type")}</TableHead>
                      <TableHead className="font-bold text-foreground">{t("list.columns.stations")}</TableHead>
                      <TableHead className="font-bold text-foreground">{t("list.columns.users")}</TableHead>
                      <TableHead className="font-bold text-foreground">{t("list.columns.status")}</TableHead>
                      <TableHead className="font-bold text-foreground">{t("list.columns.createdAt")}</TableHead>
                      <TableHead className="text-end font-bold text-foreground px-4 sm:px-6">{t("list.columns.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading
                      ? Array.from({ length: 6 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-9 w-9 rounded-xl" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-48" /><Skeleton className="mt-1 h-3 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="ms-auto h-8 w-32" /></TableCell>
                          </TableRow>
                        ))
                      : items.map((org) => {
                          const displayName = getOrganizationDisplayName(org, i18n.language);
                          const secondaryName = displayName === org.name ? org.nameAr : org.name;
                          return (
                            <TableRow key={org.id} className="hover:bg-muted/20 transition-colors">
                              <TableCell>
                                <CompanyAvatar logoUrl={org.logoUrl} name={org.name} size="sm" />
                              </TableCell>
                              <TableCell>
                                <button
                                  type="button"
                                  className="text-start"
                                  onClick={() => navigate(`/organizations/${org.id}`)}
                                >
                                  <span className="block font-bold text-sm hover:text-primary transition-colors">{displayName}</span>
                                  {secondaryName ? <span className="block text-xs text-muted-foreground" dir="auto">{secondaryName}</span> : null}
                                  {org.email ? <span className="block text-[11px] text-muted-foreground" dir="ltr">{org.email}</span> : null}
                                </button>
                              </TableCell>
                              <TableCell><OrganizationTypeBadge type={org.type} /></TableCell>
                              <TableCell className="text-sm font-medium">
                                {org.type === "FUEL_STATION" ? formatNumber(org.stationsCount ?? 0, i18n.language) : t("list.notApplicable")}
                              </TableCell>
                              <TableCell className="text-sm font-medium">{formatNumber(org.usersCount ?? 0, i18n.language)}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <OrganizationStatusBadge status={org.status} />
                                  {!org.isActive ? <ActiveBadge isActive={false} /> : null}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                {formatDate(org.createdAt, i18n.language, { year: "numeric", month: "short", day: "2-digit" })}
                              </TableCell>
                              <TableCell className="text-end px-4 sm:px-6">
                                <div className="flex items-center justify-end gap-2 flex-wrap">
                                  {org.status === "PENDING" ? (
                                    <OrganizationActions
                                      orgId={org.id}
                                      orgName={displayName}
                                      status={org.status}
                                      variant="compact"
                                      onSuccess={() => invalidate(org.id)}
                                    />
                                  ) : null}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1.5"
                                    onClick={() => navigate(`/organizations/${org.id}`)}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    {t("actions.view")}
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("actions.manage")}>
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => navigate(`/organizations/${org.id}?action=edit`)}>
                                        <Pencil className="me-2 h-4 w-4" />
                                        {t("actions.edit")}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => setPendingToggle(org)}
                                        className={org.isActive ? "text-destructive focus:text-destructive" : ""}
                                      >
                                        {org.isActive ? <PowerOff className="me-2 h-4 w-4" /> : <Power className="me-2 h-4 w-4" />}
                                        {org.isActive ? t("actions.deactivate") : t("actions.activate")}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                currentPage={params.page ?? 1}
                totalPages={totalPages}
                total={total}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!pendingToggle}
        onOpenChange={(open) => (!open ? setPendingToggle(null) : undefined)}
        title={pendingToggle?.isActive ? t("confirm.deactivateCompanyTitle") : t("confirm.activateCompanyTitle")}
        description={
          pendingToggle?.isActive
            ? t("confirm.deactivateCompanyDescription", { name: pendingToggle ? getOrganizationDisplayName(pendingToggle, i18n.language) : "" })
            : t("confirm.activateCompanyDescription", { name: pendingToggle ? getOrganizationDisplayName(pendingToggle, i18n.language) : "" })
        }
        confirmLabel={pendingToggle?.isActive ? t("actions.deactivate") : t("actions.activate")}
        variant={pendingToggle?.isActive ? "destructive" : "default"}
        isPending={setActive.isPending}
        onConfirm={confirmToggle}
      />
    </div>
  );
}
