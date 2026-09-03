import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertCircle,
  Eye,
  GitBranch,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { ActiveBadge, StationStatusBadge } from "@/components/company/CompanyBadges";
import { useGetAdminStations, useUpdateAdminStation } from "@/hooks/AdminOrganizations/useAdminStations";
import { formatDate } from "@/lib/i18n/formatters";
import { cn, getApiErrorMessage } from "@/lib/utils";
import type { AdminOrganizationDetail, AdminStation } from "@/types/adminOrganization";
import { StationFormDialog } from "../StationFormDialog";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

interface StationsTabProps {
  organization: AdminOrganizationDetail;
  openCreate: boolean;
  onOpenCreateChange: (open: boolean) => void;
}

export function StationsTab({ organization, openCreate, onOpenCreateChange }: StationsTabProps) {
  const { t, i18n } = useTranslation("adminOrganizations");
  const isFuelStation = organization.type === "FUEL_STATION";
  const { data, isLoading, error, refetch } = useGetAdminStations(isFuelStation ? organization.id : undefined);
  const updateMutation = useUpdateAdminStation();

  const [search, setSearch] = useState("");
  const [viewStation, setViewStation] = useState<AdminStation | null>(null);
  const [editStation, setEditStation] = useState<AdminStation | null>(null);
  const [toggleStation, setToggleStation] = useState<AdminStation | null>(null);

  const stations = useMemo(() => {
    // Defensive: never surface a station that is not bound to this company.
    const own = (data ?? []).filter((s) => s.organizationId === organization.id);
    const q = search.trim().toLowerCase();
    if (!q) return own;
    return own.filter((s) =>
      [s.nameEn, s.nameAr, s.licenseNumber, s.Area?.name, s.Area?.City?.name, s.address]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [data, organization.id, search]);

  const stationName = (s: AdminStation) =>
    i18n.language.startsWith("ar") ? s.nameAr || s.nameEn : s.nameEn || s.nameAr;

  const handleToggleActive = () => {
    if (!toggleStation) return;
    const nextActive = !toggleStation.isActive;
    updateMutation.mutate(
      { organizationId: organization.id, stationId: toggleStation.id, body: { isActive: nextActive } },
      {
        onSuccess: () => {
          toast.success(t("toasts.stationUpdated"));
          setToggleStation(null);
        },
        onError: (e) => toast.error(getApiErrorMessage(e, t("toasts.error"))),
      }
    );
  };

  if (!isFuelStation) {
    return (
      <Card>
        <CardContent className="p-6">
          <EmptyState icon={<GitBranch className="h-6 w-6" />} title={t("detail.stations.notFuelStation")} />
        </CardContent>
      </Card>
    );
  }

  const hasStations = (data ?? []).length > 0;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">{t("detail.stations.title")}</CardTitle>
              <CardDescription>{t("detail.stations.description")}</CardDescription>
            </div>
            <Button className="gap-2" onClick={() => onOpenCreateChange(true)}>
              <Plus className="h-4 w-4" />
              {t("actions.addStation")}
            </Button>
          </div>
          {hasStations ? (
            <div className="flex flex-col gap-2 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("detail.stations.searchPlaceholder")}
                  className="ps-10"
                />
              </div>
              <span className="text-sm text-muted-foreground">
                {t("detail.stations.count", { count: stations.length })}
              </span>
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
          ) : !hasStations ? (
            <div className="p-6">
              <EmptyState
                icon={<GitBranch className="h-6 w-6" />}
                title={t("detail.stations.emptyTitle")}
                description={t("detail.stations.emptyDescription")}
                action={
                  <Button className="gap-2" onClick={() => onOpenCreateChange(true)}>
                    <Plus className="h-4 w-4" />
                    {t("actions.addStation")}
                  </Button>
                }
              />
            </div>
          ) : stations.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={<Search className="h-6 w-6" />} title={t("list.emptyFilteredTitle")} description={t("list.emptyFilteredDescription")} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[840px]">
                <TableHeader className="bg-muted/40">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-bold text-foreground">{t("detail.stations.columns.name")}</TableHead>
                    <TableHead className="font-bold text-foreground">{t("detail.stations.columns.code")}</TableHead>
                    <TableHead className="font-bold text-foreground">{t("detail.stations.columns.location")}</TableHead>
                    <TableHead className="font-bold text-foreground">{t("detail.stations.columns.type")}</TableHead>
                    <TableHead className="font-bold text-foreground">{t("detail.stations.columns.status")}</TableHead>
                    <TableHead className="font-bold text-foreground">{t("detail.stations.columns.createdAt")}</TableHead>
                    <TableHead className="text-end font-bold text-foreground">{t("detail.stations.columns.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stations.map((station) => (
                    <TableRow key={station.id} className={cn(!station.isActive && "opacity-70")}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate" dir="auto">
                            {station.nameEn}
                          </p>
                          {station.nameAr && station.nameAr !== station.nameEn ? (
                            <p className="text-xs text-muted-foreground truncate" dir="auto">
                              {station.nameAr}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {station.licenseNumber ? (
                          <span className="font-mono text-sm" dir="ltr">
                            {station.licenseNumber}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-sm">{formatLocation(station) || <span className="text-muted-foreground">—</span>}</p>
                          {station.address ? (
                            <p className="text-xs text-muted-foreground truncate max-w-[220px]" dir="auto">
                              {station.address}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {station.FuelStationType?.name ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StationStatusBadge status={station.status} />
                          <ActiveBadge isActive={station.isActive} />
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(station.createdAt, i18n.language, { dateStyle: "medium" })}
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => setViewStation(station)}
                          >
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
                              <DropdownMenuItem onSelect={() => setEditStation(station)} className="gap-2">
                                <Pencil className="h-4 w-4" />
                                {t("actions.editStation")}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={() => setToggleStation(station)}
                                className={cn("gap-2", station.isActive && "text-destructive focus:text-destructive")}
                              >
                                {station.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                {station.isActive ? t("actions.deactivate") : t("actions.activate")}
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
      <StationFormDialog
        open={openCreate}
        onOpenChange={onOpenCreateChange}
        organizationId={organization.id}
        station={null}
      />

      {/* Edit */}
      <StationFormDialog
        open={editStation !== null}
        onOpenChange={(open) => (!open ? setEditStation(null) : undefined)}
        organizationId={organization.id}
        station={editStation}
      />

      <StationDetailsDialog station={viewStation} onClose={() => setViewStation(null)} />

      <ConfirmDialog
        open={toggleStation !== null}
        onOpenChange={(open) => (!open ? setToggleStation(null) : undefined)}
        title={toggleStation?.isActive ? t("confirm.deactivateStationTitle") : t("confirm.activateStationTitle")}
        description={
          toggleStation
            ? toggleStation.isActive
              ? t("confirm.deactivateStationDescription", { name: stationName(toggleStation) })
              : t("confirm.activateStationDescription", { name: stationName(toggleStation) })
            : undefined
        }
        confirmLabel={toggleStation?.isActive ? t("actions.deactivate") : t("actions.activate")}
        cancelLabel={t("actions.cancel")}
        variant={toggleStation?.isActive ? "destructive" : "default"}
        isPending={updateMutation.isPending}
        onConfirm={handleToggleActive}
      />
    </>
  );
}

function formatLocation(station: AdminStation): string {
  const parts = [station.Area?.City?.name, station.Area?.name].filter(Boolean);
  return parts.join(" › ");
}

function formatCoordinates(station: AdminStation): string | null {
  if (station.latitude == null || station.longitude == null) return null;
  const lat = Number(station.latitude);
  const lng = Number(station.longitude);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/** Read-only station details. */
function StationDetailsDialog({ station, onClose }: { station: AdminStation | null; onClose: () => void }) {
  const { t, i18n } = useTranslation("adminOrganizations");
  const notSet = t("detail.stations.fields.notSet");
  const coordinates = station ? formatCoordinates(station) : null;
  const workingHours = station?.workingHours ? Object.entries(station.workingHours) : [];

  return (
    <Dialog open={station !== null} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {station ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2">
                <span dir="auto">{station.nameEn}</span>
                <StationStatusBadge status={station.status} />
                <ActiveBadge isActive={station.isActive} />
              </DialogTitle>
              <DialogDescription dir="auto">{station.nameAr}</DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <section>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("form.station.sectionIdentity")}
                </h4>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                  <Field
                    label={t("detail.stations.fields.code")}
                    value={station.licenseNumber ? <span dir="ltr" className="font-mono">{station.licenseNumber}</span> : notSet}
                  />
                  <Field label={t("detail.stations.fields.type")} value={station.FuelStationType?.name ?? notSet} />
                  <Field
                    label={t("detail.stations.fields.fuelTypes")}
                    value={
                      station.FuelTypes && station.FuelTypes.length > 0 ? (
                        <span className="flex flex-wrap gap-1">
                          {station.FuelTypes.map((ft) => (
                            <Badge key={ft.id} variant="secondary" className="font-normal">
                              {ft.name}
                            </Badge>
                          ))}
                        </span>
                      ) : (
                        notSet
                      )
                    }
                    className="sm:col-span-2"
                  />
                  <Field
                    label={t("detail.stations.fields.createdAt")}
                    value={formatDate(station.createdAt, i18n.language, { dateStyle: "medium", timeStyle: "short" })}
                  />
                </dl>
              </section>

              <section>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("form.station.sectionLocation")}
                </h4>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                  <Field label={t("detail.stations.fields.location")} value={formatLocation(station) || notSet} />
                  <Field label={t("detail.stations.fields.street")} value={station.street ?? notSet} />
                  <Field label={t("detail.stations.fields.address")} value={station.address ?? notSet} className="sm:col-span-2" />
                  <Field
                    label={t("detail.stations.fields.coordinates")}
                    value={coordinates ? <span dir="ltr" className="font-mono">{coordinates}</span> : notSet}
                    className="sm:col-span-2"
                  />
                </dl>
              </section>

              <section>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("form.station.sectionContact")}
                </h4>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                  <Field label={t("detail.stations.fields.ownerName")} value={station.ownerName ?? notSet} />
                  <Field
                    label={t("detail.stations.fields.ownerEmail")}
                    value={station.ownerEmail ? <span dir="ltr">{station.ownerEmail}</span> : notSet}
                  />
                  <Field label={t("detail.stations.fields.managerName")} value={station.managerName ?? notSet} />
                  <Field
                    label={t("detail.stations.fields.managerEmail")}
                    value={station.managerEmail ? <span dir="ltr">{station.managerEmail}</span> : notSet}
                  />
                  <Field
                    label={t("detail.stations.fields.managerPhone")}
                    value={station.managerPhone ? <span dir="ltr">{station.managerPhone}</span> : notSet}
                  />
                </dl>
              </section>

              {workingHours.length > 0 ? (
                <section>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("detail.stations.fields.workingHours")}
                  </h4>
                  <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                    {[...workingHours]
                      .sort(
                        (a, b) =>
                          (DAY_KEYS as readonly string[]).indexOf(a[0]) - (DAY_KEYS as readonly string[]).indexOf(b[0])
                      )
                      .map(([day, hours]) => (
                        <li key={day} className="flex items-center justify-between gap-3 rounded-md border px-3 py-1.5">
                          <span className="font-medium">{t(`detail.stations.days.${day}`, { defaultValue: day })}</span>
                          <span className="text-muted-foreground" dir="ltr">
                            {hours?.open === "24h"
                              ? t("detail.stations.fields.allDay")
                              : [hours?.open?.trim(), hours?.close?.trim()].filter(Boolean).join(" – ") || notSet}
                          </span>
                        </li>
                      ))}
                  </ul>
                </section>
              ) : null}
            </div>
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
