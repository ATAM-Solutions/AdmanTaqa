import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import useGetCountries from "@/hooks/Location/useGetCountries";
import useGetGovernorates from "@/hooks/Location/useGetGovernorates";
import useGetCities from "@/hooks/Location/useGetCities";

export interface CompanyFormValues {
  name: string;
  nameAr: string;
  type: "FUEL_STATION" | "SERVICE_PROVIDER";
  status: "PENDING" | "APPROVED" | "REJECTED";
  registrationNumber: string;
  email: string;
  phone: string;
  address: string;
  cityId: number | null;
  rejectionReason: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_VALUES: CompanyFormValues = {
  name: "",
  nameAr: "",
  type: "FUEL_STATION",
  status: "APPROVED",
  registrationNumber: "",
  email: "",
  phone: "",
  address: "",
  cityId: null,
  rejectionReason: "",
};

interface CompanyFormProps {
  mode: "create" | "edit";
  defaultValues?: Partial<CompanyFormValues>;
  lockType?: boolean;
  isSubmitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: CompanyFormValues) => void | Promise<void>;
  onCancel?: () => void;
  formId?: string;
  hideActions?: boolean;
  /** Name of the currently saved city (edit mode) — shown until the user picks a new one. */
  currentCityName?: string | null;
}

export function CompanyForm({
  mode,
  defaultValues,
  lockType,
  isSubmitting = false,
  submitLabel,
  onSubmit,
  onCancel,
  formId = "company-form",
  hideActions = false,
  currentCityName,
}: CompanyFormProps) {
  const { t } = useTranslation("adminOrganizations");

  const schema = useMemo(
    () =>
      z
        .object({
          name: z.string().trim().min(1, t("validation.required")).max(255, t("validation.maxLength", { max: 255 })),
          nameAr: z.string().trim().max(255, t("validation.maxLength", { max: 255 })),
          type: z.enum(["FUEL_STATION", "SERVICE_PROVIDER"]),
          status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
          registrationNumber: z.string().trim().max(100, t("validation.maxLength", { max: 100 })),
          email: z
            .string()
            .trim()
            .max(255, t("validation.maxLength", { max: 255 }))
            .refine((v) => v === "" || EMAIL_RE.test(v), { message: t("validation.email") }),
          phone: z.string().trim().max(50, t("validation.maxLength", { max: 50 })),
          address: z.string().trim().max(2000, t("validation.maxLength", { max: 2000 })),
          cityId: z.number().int().positive().nullable(),
          rejectionReason: z.string().trim().max(1000, t("validation.maxLength", { max: 1000 })),
        })
        .superRefine((data, ctx) => {
          if (data.status === "REJECTED" && data.rejectionReason.trim() === "") {
            ctx.addIssue({ code: "custom", path: ["rejectionReason"], message: t("validation.required") });
          }
        }),
    [t]
  );

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ...DEFAULT_VALUES, ...defaultValues },
  });

  const status = form.watch("status");
  const cityId = form.watch("cityId");

  // Location cascade: Country → Governorate → City (city id is what we persist).
  const [countryId, setCountryId] = useState("");
  const [governorateId, setGovernorateId] = useState("");
  const { data: countriesRes } = useGetCountries();
  const { data: governoratesRes, isLoading: loadingGovernorates } = useGetGovernorates(
    countryId ? Number(countryId) : null
  );
  const { data: citiesRes, isLoading: loadingCities } = useGetCities(
    governorateId ? Number(governorateId) : null
  );
  const countries = useMemo(() => countriesRes?.data ?? [], [countriesRes]);
  const governorates = governoratesRes?.data ?? [];
  const cities = citiesRes?.data ?? [];

  // A saved city that isn't part of the currently loaded cascade (edit mode).
  const hasUnresolvedCity = cityId != null && !cities.some((c) => c.id === cityId);

  useEffect(() => {
    if (countries.length === 1 && !countryId) setCountryId(String(countries[0].id));
  }, [countries, countryId]);

  const typeLocked = !!lockType || mode === "edit";

  return (
    <Form {...form}>
      <form id={formId} onSubmit={form.handleSubmit((values) => void onSubmit(values))} className="space-y-8">
        {/* ── Identity ─────────────────────────────────────────── */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("form.company.sectionIdentity")}
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.company.name")} *</FormLabel>
                  <FormControl>
                    <Input placeholder={t("form.company.namePlaceholder")} autoComplete="organization" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nameAr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.company.nameAr")}</FormLabel>
                  <FormControl>
                    <Input dir="rtl" placeholder={t("form.company.nameArPlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.company.type")} *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={typeLocked}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("form.company.typePlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="FUEL_STATION">{t("type.FUEL_STATION")}</SelectItem>
                      <SelectItem value="SERVICE_PROVIDER">{t("type.SERVICE_PROVIDER")}</SelectItem>
                    </SelectContent>
                  </Select>
                  {typeLocked ? <FormDescription>{t("form.company.typeLocked")}</FormDescription> : null}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.company.status")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="APPROVED">{t("status.APPROVED")}</SelectItem>
                      <SelectItem value="PENDING">{t("status.PENDING")}</SelectItem>
                      <SelectItem value="REJECTED">{t("status.REJECTED")}</SelectItem>
                    </SelectContent>
                  </Select>
                  {mode === "create" ? <FormDescription>{t("form.company.statusHint")}</FormDescription> : null}
                  <FormMessage />
                </FormItem>
              )}
            />
            {status === "REJECTED" ? (
              <FormField
                control={form.control}
                name="rejectionReason"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>{t("form.company.rejectionReason")} *</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
          </div>
        </section>

        {/* ── Registration ─────────────────────────────────────── */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("form.company.sectionRegistration")}
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="registrationNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.company.registrationNumber")}</FormLabel>
                  <FormControl>
                    <Input dir="ltr" placeholder={t("form.company.registrationNumberPlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        {/* ── Contact ──────────────────────────────────────────── */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("form.company.sectionContact")}
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.company.email")}</FormLabel>
                  <FormControl>
                    <Input type="email" dir="ltr" placeholder={t("form.company.emailPlaceholder")} autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.company.phone")}</FormLabel>
                  <FormControl>
                    <Input type="tel" dir="ltr" placeholder={t("form.company.phonePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label>{t("form.company.country")}</Label>
              <Select
                value={countryId}
                onValueChange={(v) => {
                  setCountryId(v);
                  setGovernorateId("");
                  form.setValue("cityId", null, { shouldDirty: true });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("form.company.cityPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("form.company.governorate")}</Label>
              <Select
                value={governorateId}
                onValueChange={(v) => {
                  setGovernorateId(v);
                  form.setValue("cityId", null, { shouldDirty: true });
                }}
                disabled={!countryId || loadingGovernorates}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!countryId ? t("form.company.selectCountryFirst") : t("form.company.cityPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {governorates.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <FormField
              control={form.control}
              name="cityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.company.city")}</FormLabel>
                  <Select
                    value={field.value != null && cities.some((c) => c.id === field.value) ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(v ? Number(v) : null)}
                    disabled={!governorateId || loadingCities}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            hasUnresolvedCity && currentCityName
                              ? currentCityName
                              : !governorateId
                                ? t("form.company.selectGovernorateFirst")
                                : t("form.company.cityPlaceholder")
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {cities.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {hasUnresolvedCity && currentCityName ? (
                    <FormDescription>
                      {t("form.company.city")}: {currentCityName}
                    </FormDescription>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>{t("form.company.address")}</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder={t("form.company.addressPlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        {!hideActions ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {onCancel ? (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                {t("actions.cancel")}
              </Button>
            ) : null}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
              {submitLabel ?? (mode === "create" ? t("actions.create") : t("actions.save"))}
            </Button>
          </div>
        ) : null}
      </form>
    </Form>
  );
}
