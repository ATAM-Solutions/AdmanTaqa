import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import GeographyFields from "@/components/GeographyFields";
import { StationManagerPicker } from "./StationManagerPicker";
import { geoName, geoPathLabel } from "@/lib/geography";
import useGetFuelStationTypes from "@/hooks/Branches/useGetFuelStationTypes";
import useGetFuelTypes from "@/hooks/Branches/useGetFuelTypes";
import { useCreateAdminStation, useUpdateAdminStation } from "@/hooks/AdminOrganizations/useAdminStations";
import { getApiErrorMessage } from "@/lib/utils";
import type { AdminStation, CreateAdminStationBody, UpdateAdminStationBody } from "@/types/adminOrganization";

interface StationFormValues {
  nameEn: string;
  nameAr: string;
  licenseNumber: string;
  stationTypeId: number | null;
  regionId: number | null;
  cityId: number | null;
  areaId: number | null;
  fuelTypeIds: number[];
  street: string;
  address: string;
  latitude: string;
  longitude: string;
  /** Designated manager (linked user). Edit mode only — create the station first, then choose the manager. */
  managerUserId: number | null;
  status: "APPROVED" | "SUSPENDED" | "PENDING";
  isActive: boolean;
}

const emptyToNull = (v: string): string | null => (v.trim() === "" ? null : v.trim());
const toNumberOrNull = (v: string): number | null => (v.trim() === "" ? null : Number(v));

function stationToValues(station: AdminStation | null | undefined): StationFormValues {
  return {
    nameEn: station?.nameEn ?? "",
    nameAr: station?.nameAr ?? "",
    licenseNumber: station?.licenseNumber ?? "",
    stationTypeId: station?.stationTypeId ?? null,
    regionId: station?.Area?.City?.governorateId ?? station?.Area?.City?.Governorate?.id ?? null,
    cityId: station?.Area?.cityId ?? station?.Area?.City?.id ?? null,
    areaId: station?.areaId ?? null,
    fuelTypeIds: station?.FuelTypes?.map((f) => f.id) ?? [],
    street: station?.street ?? "",
    address: station?.address ?? "",
    latitude: station?.latitude != null ? String(station.latitude) : "",
    longitude: station?.longitude != null ? String(station.longitude) : "",
    managerUserId: station?.managerUserId ?? null,
    status: station?.status ?? "APPROVED",
    isActive: station?.isActive ?? true,
  };
}

function valuesToBody(v: StationFormValues): CreateAdminStationBody {
  return {
    nameEn: v.nameEn.trim(),
    nameAr: v.nameAr.trim(),
    licenseNumber: emptyToNull(v.licenseNumber),
    stationTypeId: v.stationTypeId ?? null,
    ...(v.regionId != null ? { regionId: v.regionId } : {}),
    ...(v.cityId != null ? { cityId: v.cityId } : {}),
    areaId: v.areaId as number,
    street: emptyToNull(v.street),
    address: emptyToNull(v.address),
    latitude: toNumberOrNull(v.latitude),
    longitude: toNumberOrNull(v.longitude),
    fuelTypeIds: v.fuelTypeIds,
    status: v.status,
    isActive: v.isActive,
  };
}

function diffBody(next: CreateAdminStationBody, station: AdminStation): UpdateAdminStationBody {
  const current = valuesToBody(stationToValues(station));
  const out: Partial<Record<keyof CreateAdminStationBody, unknown>> = {};
  (Object.keys(next) as (keyof CreateAdminStationBody)[]).forEach((key) => {
    const a = next[key];
    const b = current[key];
    const changed = Array.isArray(a)
      ? JSON.stringify([...a].sort()) !== JSON.stringify([...((b as number[] | undefined) ?? [])].sort())
      : a !== b;
    if (changed) out[key] = a;
  });
  // The region/city chain is validation-only: send it with a district change, never on its own.
  if ("areaId" in out) {
    out.regionId = next.regionId;
    out.cityId = next.cityId;
  } else {
    delete out.regionId;
    delete out.cityId;
  }
  return out as UpdateAdminStationBody;
}

interface StationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: number;
  station?: AdminStation | null;
  onSaved?: (station: AdminStation) => void;
}

/** Create (station null) or edit a station bound to one company. */
export function StationFormDialog({ open, onOpenChange, organizationId, station, onSaved }: StationFormDialogProps) {
  const { t } = useTranslation("adminOrganizations");
  const isEdit = !!station;
  const createMutation = useCreateAdminStation();
  const updateMutation = useUpdateAdminStation();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const schema = useMemo(() => {
    const coord = (limit: number, message: string) =>
      z
        .string()
        .trim()
        .refine((v) => v === "" || (!Number.isNaN(Number(v)) && Math.abs(Number(v)) <= limit), { message });
    return z.object({
      nameEn: z.string().trim().min(1, t("validation.required")).max(255, t("validation.maxLength", { max: 255 })),
      nameAr: z.string().trim().min(1, t("validation.required")).max(255, t("validation.maxLength", { max: 255 })),
      licenseNumber: z.string().trim().max(100, t("validation.maxLength", { max: 100 })),
      stationTypeId: z.number().int().positive().nullable(),
      // Region → City → District are all mandatory (the server re-validates the chain).
      regionId: z.number().int().positive().nullable().refine((v) => v != null, { message: t("validation.selectRegion") }),
      cityId: z.number().int().positive().nullable().refine((v) => v != null, { message: t("validation.selectCity") }),
      areaId: z.number().int().positive().nullable().refine((v) => v != null, { message: t("validation.selectArea") }),
      fuelTypeIds: z.array(z.number().int().positive()),
      street: z.string().trim().max(255, t("validation.maxLength", { max: 255 })),
      address: z.string().trim().max(2000, t("validation.maxLength", { max: 2000 })),
      latitude: coord(90, t("validation.latitude")),
      longitude: coord(180, t("validation.longitude")),
      managerUserId: z.number().int().positive().nullable(),
      status: z.enum(["APPROVED", "SUSPENDED", "PENDING"]),
      isActive: z.boolean(),
    });
  }, [t]);

  const form = useForm<StationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: stationToValues(station),
  });

  // Reference data
  const { data: stationTypes = [], isLoading: loadingStationTypes } = useGetFuelStationTypes();
  const { data: fuelTypes = [], isLoading: loadingFuelTypes } = useGetFuelTypes();
  // Selectable (active) types in catalogue order, plus this station's retired/legacy selections so they stay visible
  // (and can be unchecked) — they can never be newly checked on another station.
  const fuelOptions = useMemo(() => {
    const activeIds = new Set(fuelTypes.map((f) => f.id));
    const legacy = (station?.FuelTypes ?? [])
      .filter((f) => !activeIds.has(f.id))
      .map((f) => ({ id: f.id, name: f.name, legacy: true }));
    return [...fuelTypes.map((f) => ({ id: f.id, name: f.name, legacy: false })), ...legacy];
  }, [fuelTypes, station]);

  const { i18n } = useTranslation();
  useEffect(() => {
    if (open) form.reset(stationToValues(station));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, station]);

  const regionId = form.watch("regionId");
  const cityId = form.watch("cityId");
  const areaId = form.watch("areaId");
  const geoErrors = form.formState.errors;
  const initialLabels = useMemo(
    () => ({
      region: geoName(station?.Area?.City?.Governorate, i18n.language) || undefined,
      city: geoName(station?.Area?.City, i18n.language) || undefined,
      district: geoName(station?.Area, i18n.language) || undefined,
    }),
    [station, i18n.language]
  );
  const currentLocationLabel = station?.Area
    ? geoPathLabel([station.Area, station.Area.City, station.Area.City?.Governorate], i18n.language)
    : null;

  const submit = (values: StationFormValues) => {
    const body = valuesToBody(values);
    if (isEdit && station) {
      const patch = diffBody(body, station);
      // Designation is sent only when the admin changed it; never with a station edit that didn't touch it.
      if (values.managerUserId !== (station.managerUserId ?? null)) patch.managerUserId = values.managerUserId;
      // Legacy (retired) fuel types the admin unchecked must be released explicitly; otherwise the server keeps them.
      const activeIds = new Set(fuelTypes.map((f) => f.id));
      const released = (station.FuelTypes ?? [])
        .map((f) => f.id)
        .filter((id) => !activeIds.has(id) && !values.fuelTypeIds.includes(id));
      if (released.length && patch.fuelTypeIds !== undefined) patch.releaseFuelTypeIds = released;
      if (Object.keys(patch).length === 0) {
        toast.info(t("toasts.noChanges"));
        return;
      }
      updateMutation.mutate(
        { organizationId, stationId: station.id, body: patch },
        {
          onSuccess: (saved) => {
            toast.success(t("toasts.stationUpdated"));
            onSaved?.(saved);
            onOpenChange(false);
          },
          onError: (err) => toast.error(getApiErrorMessage(err, t("toasts.error"))),
        }
      );
      return;
    }
    createMutation.mutate(
      { organizationId, body },
      {
        onSuccess: (saved) => {
          toast.success(t("toasts.stationCreated"));
          onSaved?.(saved);
          onOpenChange(false);
        },
        onError: (err) => toast.error(getApiErrorMessage(err, t("toasts.error"))),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!isSubmitting ? onOpenChange(next) : undefined)}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("form.station.editTitle") : t("form.station.createTitle")}</DialogTitle>
          <DialogDescription>{t("form.station.description")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="station-form" onSubmit={form.handleSubmit(submit)} className="space-y-6">
            {/* Identity */}
            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("form.station.sectionIdentity")}</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField control={form.control} name="nameEn" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.station.nameEn")} *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="nameAr" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.station.nameAr")} *</FormLabel>
                    <FormControl><Input dir="rtl" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="licenseNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.station.licenseNumber")}</FormLabel>
                    <FormControl><Input dir="ltr" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="stationTypeId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.station.stationType")}</FormLabel>
                    <Select
                      value={field.value != null ? String(field.value) : ""}
                      onValueChange={(v) => field.onChange(v ? Number(v) : null)}
                      disabled={loadingStationTypes}
                    >
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder={t("form.station.stationTypePlaceholder")} /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stationTypes.map((st) => (
                          <SelectItem key={st.id} value={String(st.id)}>{st.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="fuelTypeIds" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>{t("form.station.fuelTypes")}</FormLabel>
                    {loadingFuelTypes ? (
                      <p className="text-sm text-muted-foreground">…</p>
                    ) : fuelOptions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("form.station.fuelTypesPlaceholder")}</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 rounded-lg border p-3 sm:grid-cols-3">
                        {fuelOptions.map((ft) => {
                          const checked = field.value.includes(ft.id);
                          return (
                            <label key={ft.id} className="flex cursor-pointer items-center gap-2 text-sm">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(c) =>
                                  field.onChange(c ? [...field.value, ft.id] : field.value.filter((id) => id !== ft.id))
                                }
                              />
                              <span>
                                {ft.name}
                                {ft.legacy ? (
                                  <span className="ms-1 text-xs text-muted-foreground">{t("form.station.fuelTypeRetired")}</span>
                                ) : null}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </section>

            {/* Location */}
            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("form.station.sectionLocation")}</h3>
              {/* Region → City → District, each filtered by its parent; changing a parent clears its children. */}
              <GeographyFields
                depth="district"
                required
                className="grid grid-cols-1 gap-4 md:grid-cols-2"
                value={{ regionId, cityId, areaId }}
                initialLabels={initialLabels}
                errors={{
                  region: geoErrors.regionId?.message,
                  city: geoErrors.cityId?.message,
                  district: geoErrors.areaId?.message,
                }}
                onChange={(next) => {
                  form.setValue("regionId", next.regionId, { shouldDirty: true, shouldValidate: form.formState.isSubmitted });
                  form.setValue("cityId", next.cityId, { shouldDirty: true, shouldValidate: form.formState.isSubmitted });
                  form.setValue("areaId", next.areaId, { shouldDirty: true, shouldValidate: form.formState.isSubmitted });
                }}
              />
              {isEdit && currentLocationLabel ? (
                <p className="text-xs text-muted-foreground">{currentLocationLabel}</p>
              ) : null}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField control={form.control} name="street" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.station.street")}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.station.address")}</FormLabel>
                    <FormControl><Textarea rows={1} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="latitude" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.station.latitude")}</FormLabel>
                    <FormControl><Input dir="ltr" inputMode="decimal" placeholder="24.7136" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="longitude" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.station.longitude")}</FormLabel>
                    <FormControl><Input dir="ltr" inputMode="decimal" placeholder="46.6753" {...field} /></FormControl>
                    <FormDescription>{t("form.station.coordinatesHint")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </section>

            {/* Manager: create the station first, then link an existing eligible user (no hand-typed contact data). */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("manager.section")}</h3>
              {isEdit && station ? (
                <StationManagerPicker
                  organizationId={organizationId}
                  station={station}
                  value={form.watch("managerUserId")}
                  onChange={(id) => form.setValue("managerUserId", id, { shouldDirty: true })}
                />
              ) : (
                <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">{t("manager.createFirst")}</p>
              )}
            </section>

            {isEdit ? (
              <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.station.status")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="APPROVED">{t("stationStatus.APPROVED")}</SelectItem>
                        <SelectItem value="SUSPENDED">{t("stationStatus.SUSPENDED")}</SelectItem>
                        <SelectItem value="PENDING">{t("stationStatus.PENDING")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="isActive" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border px-3 py-2">
                    <FormLabel className="font-normal">{t("form.station.active")}</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
              </section>
            ) : null}
          </form>
        </Form>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t("actions.cancel")}
          </Button>
          <Button type="submit" form="station-form" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
            {isEdit ? t("actions.save") : t("actions.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
