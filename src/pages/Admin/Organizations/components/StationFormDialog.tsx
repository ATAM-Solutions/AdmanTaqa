import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import useGetCountries from "@/hooks/Location/useGetCountries";
import useGetGovernorates from "@/hooks/Location/useGetGovernorates";
import useGetCities from "@/hooks/Location/useGetCities";
import useGetAreas from "@/hooks/Location/useGetAreas";
import { getAreaDetails } from "@/hooks/Location/useGetAreaDetails";
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
  areaId: number | null;
  fuelTypeIds: number[];
  street: string;
  address: string;
  latitude: string;
  longitude: string;
  managerName: string;
  managerEmail: string;
  managerPhone: string;
  status: "APPROVED" | "SUSPENDED" | "PENDING";
  isActive: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emptyToNull = (v: string): string | null => (v.trim() === "" ? null : v.trim());
const toNumberOrNull = (v: string): number | null => (v.trim() === "" ? null : Number(v));

function stationToValues(station: AdminStation | null | undefined): StationFormValues {
  return {
    nameEn: station?.nameEn ?? "",
    nameAr: station?.nameAr ?? "",
    licenseNumber: station?.licenseNumber ?? "",
    stationTypeId: station?.stationTypeId ?? null,
    areaId: station?.areaId ?? null,
    fuelTypeIds: station?.FuelTypes?.map((f) => f.id) ?? [],
    street: station?.street ?? "",
    address: station?.address ?? "",
    latitude: station?.latitude != null ? String(station.latitude) : "",
    longitude: station?.longitude != null ? String(station.longitude) : "",
    managerName: station?.managerName ?? "",
    managerEmail: station?.managerEmail ?? "",
    managerPhone: station?.managerPhone ?? "",
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
    areaId: v.areaId as number,
    street: emptyToNull(v.street),
    address: emptyToNull(v.address),
    latitude: toNumberOrNull(v.latitude),
    longitude: toNumberOrNull(v.longitude),
    managerName: emptyToNull(v.managerName),
    managerEmail: emptyToNull(v.managerEmail),
    managerPhone: emptyToNull(v.managerPhone),
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
      areaId: z
        .number()
        .int()
        .positive()
        .nullable()
        .refine((v) => v != null, { message: t("validation.selectArea") }),
      fuelTypeIds: z.array(z.number().int().positive()),
      street: z.string().trim().max(255, t("validation.maxLength", { max: 255 })),
      address: z.string().trim().max(2000, t("validation.maxLength", { max: 2000 })),
      latitude: coord(90, t("validation.latitude")),
      longitude: coord(180, t("validation.longitude")),
      managerName: z.string().trim().max(255, t("validation.maxLength", { max: 255 })),
      managerEmail: z
        .string()
        .trim()
        .max(255, t("validation.maxLength", { max: 255 }))
        .refine((v) => v === "" || EMAIL_RE.test(v), { message: t("validation.email") }),
      managerPhone: z.string().trim().max(50, t("validation.maxLength", { max: 50 })),
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

  // Location cascade
  const [countryId, setCountryId] = useState("");
  const [governorateId, setGovernorateId] = useState("");
  const [cityId, setCityId] = useState("");
  const [changeLocation, setChangeLocation] = useState(!isEdit);
  const { data: countriesRes } = useGetCountries();
  const { data: governoratesRes, isLoading: loadingGovernorates } = useGetGovernorates(countryId ? Number(countryId) : null);
  const { data: citiesRes, isLoading: loadingCities } = useGetCities(governorateId ? Number(governorateId) : null);
  const { data: areasRes, isLoading: loadingAreas } = useGetAreas(cityId ? Number(cityId) : null);
  const countries = useMemo(() => countriesRes?.data ?? [], [countriesRes]);
  const governorates = governoratesRes?.data ?? [];
  const cities = citiesRes?.data ?? [];
  const areas = areasRes?.data ?? [];

  useEffect(() => {
    if (open) {
      form.reset(stationToValues(station));
      setCountryId("");
      setGovernorateId("");
      setCityId("");
      setChangeLocation(!station);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, station]);

  useEffect(() => {
    if (countries.length === 1 && !countryId) setCountryId(String(countries[0].id));
  }, [countries, countryId]);

  const areaId = form.watch("areaId");
  const currentLocationLabel = station?.Area
    ? [station.Area.name, station.Area.City?.name].filter(Boolean).join(" · ")
    : null;

  const applyAreaCoordinates = (id: number) => {
    const { latitude, longitude } = form.getValues();
    if (latitude.trim() !== "" || longitude.trim() !== "") return;
    getAreaDetails(id)
      .then((details) => {
        if (details?.latitude != null && details?.longitude != null) {
          form.setValue("latitude", String(details.latitude), { shouldDirty: true });
          form.setValue("longitude", String(details.longitude), { shouldDirty: true });
        }
      })
      .catch(() => {});
  };

  const submit = (values: StationFormValues) => {
    const body = valuesToBody(values);
    if (isEdit && station) {
      const patch = diffBody(body, station);
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
                    ) : fuelTypes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("form.station.fuelTypesPlaceholder")}</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 rounded-lg border p-3 sm:grid-cols-3">
                        {fuelTypes.map((ft) => {
                          const checked = field.value.includes(ft.id);
                          return (
                            <label key={ft.id} className="flex cursor-pointer items-center gap-2 text-sm">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(c) =>
                                  field.onChange(c ? [...field.value, ft.id] : field.value.filter((id) => id !== ft.id))
                                }
                              />
                              <span>{ft.name}</span>
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
              {isEdit && !changeLocation ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{currentLocationLabel ?? t("form.station.area")}</span>
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setChangeLocation(true)}>
                    {t("logo.change")}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("form.station.country")}</Label>
                    <Select value={countryId} onValueChange={(v) => { setCountryId(v); setGovernorateId(""); setCityId(""); form.setValue("areaId", null); }}>
                      <SelectTrigger><SelectValue placeholder={t("form.station.selectPlaceholder")} /></SelectTrigger>
                      <SelectContent>
                        {countries.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("form.station.governorate")}</Label>
                    <Select value={governorateId} onValueChange={(v) => { setGovernorateId(v); setCityId(""); form.setValue("areaId", null); }} disabled={!countryId || loadingGovernorates}>
                      <SelectTrigger><SelectValue placeholder={!countryId ? t("form.station.selectCountryFirst") : t("form.station.selectPlaceholder")} /></SelectTrigger>
                      <SelectContent>
                        {governorates.map((g) => <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("form.station.city")}</Label>
                    <Select value={cityId} onValueChange={(v) => { setCityId(v); form.setValue("areaId", null); }} disabled={!governorateId || loadingCities}>
                      <SelectTrigger><SelectValue placeholder={!governorateId ? t("form.station.selectGovernorateFirst") : t("form.station.selectPlaceholder")} /></SelectTrigger>
                      <SelectContent>
                        {cities.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormField control={form.control} name="areaId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.station.area")} *</FormLabel>
                      <Select
                        value={field.value != null && areas.some((a) => a.id === field.value) ? String(field.value) : ""}
                        onValueChange={(v) => {
                          const id = v ? Number(v) : null;
                          field.onChange(id);
                          if (id) applyAreaCoordinates(id);
                        }}
                        disabled={!cityId || loadingAreas}
                      >
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder={!cityId ? t("form.station.selectCityFirst") : t("form.station.selectPlaceholder")} /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {areas.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {isEdit && areaId === station?.areaId && currentLocationLabel ? (
                        <FormDescription>{currentLocationLabel}</FormDescription>
                      ) : null}
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}
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

            {/* Contacts */}
            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("form.station.sectionContact")}</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FormField control={form.control} name="managerName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.station.managerName")}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="managerEmail" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.station.managerEmail")}</FormLabel>
                    <FormControl><Input type="email" dir="ltr" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="managerPhone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.station.managerPhone")}</FormLabel>
                    <FormControl><Input type="tel" dir="ltr" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
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
