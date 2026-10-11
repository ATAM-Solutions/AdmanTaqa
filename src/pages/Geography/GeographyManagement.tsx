import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/patterns/PageHeader";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import TablePagination from "@/components/TablePagination";
import GeographyFields from "@/components/GeographyFields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import useGetCountries from "@/hooks/Location/useGetCountries";
import {
  useCreateGeography,
  useDeleteGeography,
  useGeographyAdminList,
  useUpdateGeography,
} from "@/hooks/Location/useGeography";
import { EMPTY_GEOGRAPHY, geoName, getApiErrorCode, type GeographySelection } from "@/lib/geography";
import { getApiErrorMessage } from "@/lib/utils";
import type { GeographyNode } from "@/types/location";

type Level = "region" | "city" | "district";
const PAGE_SIZE = 25;

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const h = setTimeout(() => setV(value), ms);
    return () => clearTimeout(h);
  }, [value, ms]);
  return v;
}

/** SUPER_ADMIN geography management: regions, cities and districts with bilingual names, search and paging. */
export default function GeographyManagement() {
  const { t, i18n } = useTranslation("geography");
  const [level, setLevel] = useState<Level>("region");
  const [filter, setFilter] = useState<GeographySelection>(EMPTY_GEOGRAPHY);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<GeographyNode | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<GeographyNode | null>(null);

  const { data: countriesRes } = useGetCountries();
  const countries = useMemo(() => countriesRes?.data ?? [], [countriesRes]);
  const defaultCountryId = countries.length === 1 ? countries[0].id : null;

  const debouncedSearch = useDebounced(search);

  // The parent filter that applies to the current tab.
  const parentId =
    level === "region" ? defaultCountryId : level === "city" ? filter.regionId : filter.cityId;
  const needsParent = level !== "region";
  const list = useGeographyAdminList(
    {
      level,
      parentId,
      q: debouncedSearch,
      isActive: status === "all" ? null : status === "active",
      page,
      limit: PAGE_SIZE,
    },
    !needsParent || parentId != null
  );

  const updateMutation = useUpdateGeography(level);
  const deleteMutation = useDeleteGeography(level);

  const rows = list.data?.data ?? [];
  const total = list.data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const levelName = t(`levelSingular.${level}`);

  const toggleActive = (row: GeographyNode, next: boolean) =>
    updateMutation.mutate(
      { id: row.id, body: { isActive: next } },
      {
        onSuccess: () => toast.success(next ? t("admin.toasts.activated") : t("admin.toasts.deactivated")),
        onError: (e) => toast.error(getApiErrorMessage(e, t("admin.toasts.error"))),
      }
    );

  const confirmDelete = () => {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, {
      onSuccess: () => {
        toast.success(t("admin.toasts.deleted"));
        setDeleting(null);
      },
      onError: (e) => {
        toast.error(getApiErrorCode(e) === "GEOGRAPHY_IN_USE" ? t("admin.toasts.inUse") : getApiErrorMessage(e, t("admin.toasts.error")));
        setDeleting(null);
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin.title")}
        description={t("admin.subtitle")}
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus className="me-2 h-4 w-4" />
            {t("admin.add", { level: levelName })}
          </Button>
        }
      />

      <Tabs
        value={level}
        onValueChange={(v) => {
          setLevel(v as Level);
          setSearch("");
          setPage(1);
        }}
      >
        <TabsList className="h-auto flex-wrap">
          {(["region", "city", "district"] as Level[]).map((l) => (
            <TabsTrigger key={l} value={l}>
              {t(`levels.${l}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {needsParent ? (
        <div className="rounded-lg border p-4">
          <GeographyFields
            depth={level === "city" ? "region" : "city"}
            value={filter}
            onChange={(next) => {
              setFilter(next);
              setPage(1);
            }}
            className="grid grid-cols-1 gap-4 md:grid-cols-3"
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("admin.search")}
            className="ps-9"
            aria-label={t("admin.search")}
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as typeof status);
            setPage(1);
          }}
        >
          <SelectTrigger className="md:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.status.all")}</SelectItem>
            <SelectItem value="active">{t("admin.status.active")}</SelectItem>
            <SelectItem value="inactive">{t("admin.status.inactive")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {needsParent && parentId == null ? (
        <EmptyState title={t("admin.needParent", { level: t(`levels.${level}`) })} />
      ) : list.isError ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/50 p-4 text-sm text-destructive" role="alert">
          <span>{t("admin.loadFailed")}</span>
          <Button variant="outline" size="sm" onClick={() => list.refetch()}>
            {t("retry")}
          </Button>
        </div>
      ) : list.isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          {t("loading")}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title={debouncedSearch ? t("admin.noResults") : t("admin.empty")} />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.columns.nameAr")}</TableHead>
                  <TableHead>{t("admin.columns.nameEn")}</TableHead>
                  <TableHead className="text-center">{t("admin.columns.children")}</TableHead>
                  <TableHead className="text-center">{t("admin.columns.usage")}</TableHead>
                  <TableHead>{t("admin.columns.status")}</TableHead>
                  <TableHead className="text-end">{t("admin.columns.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} className={row.isActive ? undefined : "opacity-60"}>
                    <TableCell className="font-medium" dir="rtl">
                      {row.nameAr || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell dir="ltr" className="text-start">
                      {row.nameEn}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">{row.childCount ?? 0}</TableCell>
                    <TableCell className="text-center tabular-nums">{row.referenceCount ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={row.isActive ? "default" : "secondary"}>
                          {row.isActive ? t("admin.active") : t("admin.inactive")}
                        </Badge>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={updateMutation.isPending}
                          onClick={() => toggleActive(row, !row.isActive)}
                        >
                          {row.isActive ? t("admin.deactivate") : t("admin.activate")}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label={t("admin.edit")} onClick={() => setEditing(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label={t("admin.delete")} onClick={() => setDeleting(row)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <TablePagination currentPage={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      )}
      <p className="text-xs text-muted-foreground">{t("admin.legacyNote")}</p>

      <GeographyFormDialog
        open={creating || !!editing}
        level={level}
        row={editing}
        defaultParentId={parentId}
        defaultCountryId={defaultCountryId}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false);
            setEditing(null);
          }
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("admin.delete_.title", { name: deleting ? geoName(deleting, i18n.language) : "" })}
        description={t("admin.delete_.description")}
        confirmLabel={t("admin.delete_.confirm")}
        variant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

interface FormDialogProps {
  open: boolean;
  level: Level;
  row: GeographyNode | null;
  defaultParentId: number | null;
  defaultCountryId: number | null;
  onOpenChange: (open: boolean) => void;
}

function GeographyFormDialog({ open, level, row, defaultParentId, defaultCountryId, onOpenChange }: FormDialogProps) {
  const { t, i18n } = useTranslation("geography");
  const isEdit = !!row;
  const create = useCreateGeography(level);
  const update = useUpdateGeography(level);
  const pending = create.isPending || update.isPending;
  const { data: countriesRes } = useGetCountries();

  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [code, setCode] = useState("");
  const [countryId, setCountryId] = useState<number | null>(null);
  const [parentGeo, setParentGeo] = useState<GeographySelection>(EMPTY_GEOGRAPHY);
  const [errors, setErrors] = useState<{ nameEn?: string; nameAr?: string; parent?: string }>({});

  useEffect(() => {
    if (!open) return;
    setNameEn(row?.nameEn ?? "");
    setNameAr(row?.nameAr ?? "");
    setCode(row?.code ?? "");
    setErrors({});
    setCountryId(defaultCountryId);
    // Preselect the parent the list is currently filtered by.
    setParentGeo({
      regionId: level === "city" ? defaultParentId : null,
      cityId: level === "district" ? defaultParentId : null,
      areaId: null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row?.id, level]);

  const parentIdValue = level === "region" ? countryId : level === "city" ? parentGeo.regionId : parentGeo.cityId;

  const submit = () => {
    const next: typeof errors = {};
    if (!nameEn.trim()) next.nameEn = t("admin.form.required");
    if (!nameAr.trim()) next.nameAr = t("admin.form.required");
    if (!isEdit && parentIdValue == null) next.parent = t("admin.form.selectParent");
    setErrors(next);
    if (Object.keys(next).length) return;
    const onError = (e: unknown) =>
      toast.error(
        getApiErrorCode(e) === "GEOGRAPHY_DUPLICATE_NAME" ? t("admin.toasts.duplicate") : getApiErrorMessage(e, t("admin.toasts.error"))
      );
    if (isEdit && row) {
      update.mutate(
        { id: row.id, body: { name: nameEn.trim(), nameAr: nameAr.trim(), code: code.trim() || null } },
        { onSuccess: () => { toast.success(t("admin.toasts.updated")); onOpenChange(false); }, onError }
      );
    } else {
      create.mutate(
        { parentId: parentIdValue as number, name: nameEn.trim(), nameAr: nameAr.trim(), ...(code.trim() ? { code: code.trim() } : {}) },
        { onSuccess: () => { toast.success(t("admin.toasts.created")); onOpenChange(false); }, onError }
      );
    }
  };

  const levelName = t(`levelSingular.${level}`);
  return (
    <Dialog open={open} onOpenChange={(o) => (!pending ? onOpenChange(o) : undefined)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("admin.form.editTitle", { level: levelName }) : t("admin.form.createTitle", { level: levelName })}</DialogTitle>
          <DialogDescription>{t(`admin.parent.${level}`)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!isEdit ? (
            <div className="space-y-2">
              <Label>{t("admin.form.parent")} *</Label>
              {level === "region" ? (
                <Select value={countryId != null ? String(countryId) : ""} onValueChange={(v) => setCountryId(Number(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("placeholder.country")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(countriesRes?.data ?? []).map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {geoName(c, i18n.language)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <GeographyFields
                  depth={level === "city" ? "region" : "city"}
                  value={parentGeo}
                  onChange={setParentGeo}
                  className="grid grid-cols-1 gap-3"
                />
              )}
              {errors.parent ? <p className="text-sm font-medium text-destructive">{errors.parent}</p> : null}
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="geo-name-en">{t("admin.form.nameEn")} *</Label>
            <Input id="geo-name-en" dir="ltr" value={nameEn} maxLength={255} onChange={(e) => setNameEn(e.target.value)} />
            {errors.nameEn ? <p className="text-sm font-medium text-destructive">{errors.nameEn}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="geo-name-ar">{t("admin.form.nameAr")} *</Label>
            <Input id="geo-name-ar" dir="rtl" value={nameAr} maxLength={255} onChange={(e) => setNameAr(e.target.value)} />
            {errors.nameAr ? <p className="text-sm font-medium text-destructive">{errors.nameAr}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="geo-code">{t("admin.form.code")}</Label>
            <Input id="geo-code" dir="ltr" value={code} maxLength={20} onChange={(e) => setCode(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            {t("admin.form.cancel")}
          </Button>
          <Button type="button" disabled={pending} onClick={submit}>
            {pending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
            {isEdit ? t("admin.form.save") : t("admin.form.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
