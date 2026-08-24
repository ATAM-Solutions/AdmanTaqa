import { useState } from "react";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import logo from "@/assets/logo.jpeg";
import { useRegisterV2Form, REGISTER_V2_FILE_KEYS, getRequiredFileKeys } from "@/hooks/Auth/useRegisterV2Form";
import useGetCountries from "@/hooks/Location/useGetCountries";
import useGetGovernorates from "@/hooks/Location/useGetGovernorates";
import useGetCities from "@/hooks/Location/useGetCities";
import useGetAreas from "@/hooks/Location/useGetAreas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import DarkModeToggle from "@/components/DarkModeToggle";
import {
  User,
  Lock,
  Building2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  MapPin,
  CheckCircle2,
} from "lucide-react";

const FILE_ACCEPT = "application/pdf,image/jpeg,image/png,image/gif,image/webp";

export default function Register() {
  const { t } = useTranslation("auth");
  const formMethods = useRegisterV2Form();
  const {
    control,
    watch,
    setValue,
    formState: { errors, isValid },
    isLoading,
    apiError,
    files,
    setFile,
    registrationSuccess,
    submitForm,
  } = formMethods;

  const organizationType = watch("organizationType");
  const cityIdWatch = watch("cityId");

  const [locationCountryId, setLocationCountryId] = useState<number | null>(null);
  const [locationGovernorateId, setLocationGovernorateId] = useState<number | null>(null);

  const countries = useGetCountries().data?.data ?? [];
  const governorates = useGetGovernorates(locationCountryId).data?.data ?? [];
  const cities = useGetCities(locationGovernorateId).data?.data ?? [];
  const cityIdNum = cityIdWatch != null && cityIdWatch !== "" ? Number(cityIdWatch) : null;
  const areas = useGetAreas(cityIdNum).data?.data ?? [];
  const isServiceProvider = organizationType === "SERVICE_PROVIDER";

  const totalSteps = 4;
  const [step, setStep] = useState(1);
  const effectiveStep = step > totalSteps ? totalSteps : step;

  const requiredFileKeys = getRequiredFileKeys(organizationType);
  const hasRequiredFiles = requiredFileKeys.every((k) => files[k]);
  const canSubmit = isValid && hasRequiredFiles;

  const goNext = () => {
    if (effectiveStep < totalSteps) setStep(effectiveStep + 1);
  };
  const goBack = () => {
    if (effectiveStep > 1) setStep(effectiveStep - 1);
  };

  const isLastStep = effectiveStep === totalSteps;

  const stepLabel =
    effectiveStep === 1
      ? t("register.steps.orgAccount")
      : effectiveStep === 2
        ? isServiceProvider
          ? t("register.steps.providerProfile")
          : t("register.steps.stationProfile")
        : effectiveStep === 3
          ? t("register.steps.providerDocuments")
          : t("register.steps.orgDocuments");

  const fileLabels: Record<(typeof REGISTER_V2_FILE_KEYS)[number], string> = {
    org_license: t("register.documents.files.org_license"),
    org_registration: t("register.documents.files.org_registration"),
    org_other: t("register.documents.files.org_other"),
    sp_commercial_registration: t("register.documents.files.sp_commercial_registration"),
    sp_tax_certificate: t("register.documents.files.sp_tax_certificate"),
    sp_technical_certificate: t("register.documents.files.sp_technical_certificate"),
    sp_insurance_certificate: t("register.documents.files.sp_insurance_certificate"),
  };

  if (registrationSuccess) {
    const org = registrationSuccess.data?.organization;
    const docs = registrationSuccess.documentsReceived;
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <div className="w-full max-w-lg space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <img src={logo} alt="Servexa" className="h-12 w-12 rounded-2xl object-cover shadow-lg shadow-primary/20" />
            <h1 className="text-xl font-bold tracking-tight">Servexa Admin</h1>
          </div>

          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-primary/10 p-4">
                  <CheckCircle2 className="h-12 w-12 text-primary" />
                </div>
              </div>
              <h2 className="text-xl font-bold tracking-tight">
                {registrationSuccess.message ?? t("register.success.defaultMessage")}
              </h2>
              {org && (
                <div className="rounded-lg border p-4 text-start space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{t("register.success.organization")}</p>
                  <p className="font-medium">{org.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("register.success.type")}: {org.type.replace("_", " ")} · {t("register.success.status")}:{" "}
                    <span className="font-medium text-amber-600 dark:text-amber-400">{org.status}</span>
                  </p>
                </div>
              )}
              {docs && (docs.organization?.length || docs.serviceProvider?.length) ? (
                <div className="rounded-lg border p-4 text-start space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{t("register.success.documentsReceivedHeading")}</p>
                  {docs.organization?.length ? (
                    <p className="text-xs">{t("register.success.organizationDocs")}: {docs.organization.join(", ")}</p>
                  ) : null}
                  {docs.serviceProvider?.length ? (
                    <p className="text-xs">{t("register.success.providerDocs")}: {docs.serviceProvider.join(", ")}</p>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="flex items-center justify-center gap-1">
            <LanguageSwitcher />
            <DarkModeToggle />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors group">
            <ChevronLeft className="h-4 w-4 rtl:rotate-180 group-hover:-translate-x-1 rtl:group-hover:translate-x-1 transition-transform" />
            {t("register.backToLogin")}
          </Link>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <DarkModeToggle />
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <img src={logo} alt="Servexa" className="h-12 w-12 rounded-2xl object-cover shadow-lg shadow-primary/20" />
          <h1 className="text-2xl font-bold tracking-tight">{t("register.title")}</h1>
          <p className="text-muted-foreground">{t("register.subtitle")}</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t("register.stepOf", { current: effectiveStep, total: totalSteps })}
              </p>
              <div className="flex gap-2">
                {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${s <= effectiveStep ? "bg-primary" : "bg-muted"}`}
                  />
                ))}
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">{stepLabel}</p>
            </div>

            <Form {...formMethods}>
            <form onSubmit={submitForm} className="space-y-8">
              {apiError && (
                <Alert variant="destructive">
                  <AlertDescription>{apiError}</AlertDescription>
                </Alert>
              )}

              {/* Step 1: Organization + First user + Email & password */}
              {effectiveStep === 1 && (
                <div className="space-y-8 animate-in fade-in duration-200">
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-primary flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5" />
                      {t("register.sections.organization")}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={control}
                        name="organizationName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("register.fields.organizationName")} *</FormLabel>
                            <FormControl>
                              <Input placeholder={t("register.fields.organizationNamePlaceholder")} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name="organizationType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("register.fields.organizationType")} *</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="SERVICE_PROVIDER">{t("register.fields.organizationTypeServiceProvider")}</SelectItem>
                                <SelectItem value="FUEL_STATION">{t("register.fields.organizationTypeFuelStation")}</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-primary flex items-center gap-2">
                      <User className="h-3.5 w-3.5" />
                      {t("register.sections.representative")}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("register.fields.fullName")} *</FormLabel>
                            <FormControl>
                              <Input placeholder={t("register.fields.fullNamePlaceholder")} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("register.fields.phone")} *</FormLabel>
                            <FormControl>
                              <div dir="ltr" className="flex h-10 rounded-md border border-input bg-background overflow-hidden">
                                <span className="inline-flex items-center px-3 text-sm text-muted-foreground border-e border-input bg-muted/30">
                                  +966
                                </span>
                                <Input
                                  type="tel"
                                  inputMode="numeric"
                                  maxLength={9}
                                  placeholder="501234567"
                                  className="border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
                                  aria-invalid={!!errors.phone}
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-primary flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5" />
                      {t("register.sections.credentials")}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("register.fields.email")} *</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder={t("register.fields.emailPlaceholder")} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("register.fields.password")} *</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Service provider profile (SP) / Station profile (Fuel) — same fields */}
              {effectiveStep === 2 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-primary flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    {isServiceProvider ? t("register.steps.providerProfile") : t("register.steps.stationProfile")}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={control}
                      name="licenseNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("register.fields.licenseNumber")} *</FormLabel>
                          <FormControl>
                            <Input placeholder={t("register.fields.licenseNumberPlaceholder")} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="yearsExperience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("register.fields.yearsExperience")} *</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} placeholder="5" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="space-y-2">
                      <Label>{t("register.fields.country")} *</Label>
                      <Select
                        value={locationCountryId != null ? String(locationCountryId) : undefined}
                        onValueChange={(v) => {
                          setLocationCountryId(Number(v));
                          setLocationGovernorateId(null);
                          setValue("cityId", "");
                          setValue("areaId", "");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("register.fields.selectCountry")} />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("register.fields.governorate")} *</Label>
                      <Select
                        value={locationGovernorateId != null ? String(locationGovernorateId) : undefined}
                        disabled={!locationCountryId}
                        onValueChange={(v) => {
                          setLocationGovernorateId(Number(v));
                          setValue("cityId", "");
                          setValue("areaId", "");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("register.fields.selectGovernorate")} />
                        </SelectTrigger>
                        <SelectContent>
                          {governorates.map((g) => (
                            <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <FormField
                      control={control}
                      name="cityId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("register.fields.city")} *</FormLabel>
                          <Select
                            value={field.value || undefined}
                            disabled={!locationGovernorateId}
                            onValueChange={(v) => {
                              field.onChange(v);
                              setValue("areaId", "");
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t("register.fields.selectCity")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {cities.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="areaId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("register.fields.area")} *</FormLabel>
                          <Select value={field.value || undefined} disabled={!cityIdNum} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t("register.fields.selectArea")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {areas.map((a) => (
                                <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="street"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>{t("register.fields.street")} *</FormLabel>
                          <FormControl>
                            <Input placeholder={t("register.fields.streetPlaceholder")} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Service provider documents (first) */}
              {effectiveStep === 3 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-primary flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" />
                    {t("register.documents.providerHeading")}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(["sp_commercial_registration", "sp_tax_certificate", "sp_technical_certificate", "sp_insurance_certificate"] as const).map((key) => (
                      <div key={key} className="space-y-2">
                        <Label>{fileLabels[key]}</Label>
                        <Input
                          type="file"
                          accept={FILE_ACCEPT}
                          onChange={(e) => setFile(key, e.target.files?.[0] ?? null)}
                        />
                        {files[key] && <p className="text-xs text-muted-foreground truncate">{files[key]?.name}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4: Organization documents (second) */}
              {effectiveStep === 4 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-primary flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" />
                    {t("register.documents.orgHeading")}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(["org_license", "org_registration", "org_other"] as const).map((key) => (
                      <div key={key} className="space-y-2">
                        <Label>{fileLabels[key]}</Label>
                        <Input
                          type="file"
                          accept={FILE_ACCEPT}
                          onChange={(e) => setFile(key, e.target.files?.[0] ?? null)}
                        />
                        {files[key] && <p className="text-xs text-muted-foreground truncate">{files[key]?.name}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                {effectiveStep > 1 ? (
                  <Button type="button" variant="outline" className="gap-2" onClick={goBack} disabled={isLoading}>
                    <ChevronLeft className="h-4 w-4 rtl:rotate-180" /> {t("register.back")}
                  </Button>
                ) : (
                  <div />
                )}
                <div className="flex-1" />
                {!isLastStep ? (
                  <Button type="button" className="gap-2" onClick={goNext}>
                    {t("register.continue")} <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                  </Button>
                ) : (
                  <Button type="submit" className="gap-2 min-w-[180px]" disabled={isLoading || !canSubmit}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("register.submitting")}
                      </>
                    ) : (
                      t("register.submit")
                    )}
                  </Button>
                )}
              </div>

              <p className="text-center text-xs text-muted-foreground px-8">
                <Trans i18nKey="register.pendingNotice" ns="auth" components={{ strong: <strong className="font-semibold text-foreground" /> }} />
              </p>
            </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
