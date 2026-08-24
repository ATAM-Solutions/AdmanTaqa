import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wrench, Plus } from "lucide-react";
import { toast } from "sonner";
import useGetServiceProviderProfile from "@/hooks/Organization/useGetServiceProviderProfile";
import useCreateServiceProviderProfile from "@/hooks/Organization/useCreateServiceProviderProfile";
import useUpdateServiceProviderProfile from "@/hooks/Organization/useUpdateServiceProviderProfile";
import useGetCountries from "@/hooks/Location/useGetCountries";
import useGetGovernorates from "@/hooks/Location/useGetGovernorates";
import useGetCities from "@/hooks/Location/useGetCities";
import useGetAreas from "@/hooks/Location/useGetAreas";
import type { ServiceProviderProfileBody } from "@/types/organization";

interface ProfileServiceProviderProfileCardProps {
  organizationId: number;
  /** When true, render content only without Card wrapper (for use inside UnifiedProfileCard) */
  embedded?: boolean;
}

export default function ProfileServiceProviderProfileCard({ organizationId, embedded }: ProfileServiceProviderProfileCardProps) {
  const { t } = useTranslation("profile");
  const { data: profile, isLoading: profileLoading } = useGetServiceProviderProfile(organizationId);
  const createMutation = useCreateServiceProviderProfile();
  const updateMutation = useUpdateServiceProviderProfile();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ServiceProviderProfileBody>({
    licenseNumber: "",
    yearsExperience: undefined,
    areaId: undefined,
    cityId: undefined,
    street: "",
    serviceCategories: [],
  });
  const [countryId, setCountryId] = useState<number | null>(null);
  const [governorateId, setGovernorateId] = useState<number | null>(null);

  const countries = useGetCountries().data?.data ?? [];
  const governorates = useGetGovernorates(countryId).data?.data ?? [];
  const cities = useGetCities(governorateId).data?.data ?? [];
  const areas = useGetAreas(form.cityId ?? null).data?.data ?? [];

  const openCreateForm = () => {
    setForm({
      licenseNumber: "",
      yearsExperience: undefined,
      areaId: undefined,
      cityId: undefined,
      street: "",
      serviceCategories: [],
    });
    setCountryId(null);
    setGovernorateId(null);
    setShowForm(true);
    setEditing(false);
  };

  const submitForm = () => {
    const body: ServiceProviderProfileBody = {
      ...form,
      serviceCategories: Array.isArray(form.serviceCategories) ? form.serviceCategories : [],
    };
    if (editing) {
      updateMutation.mutate(
        { organizationId, body },
        {
          onSuccess: () => {
            toast.success(t("spProfileCard.profileUpdated"));
            setShowForm(false);
          },
          onError: (e) => toast.error((e as Error)?.message ?? t("spProfileCard.updateFailed")),
        }
      );
    } else {
      createMutation.mutate(
        { organizationId, body },
        {
          onSuccess: () => {
            toast.success(t("spProfileCard.profileCreated"));
            setShowForm(false);
          },
          onError: (e) => toast.error((e as Error)?.message ?? t("spProfileCard.createFailed")),
        }
      );
    }
  };

  if (profileLoading) {
    if (embedded) return <div className="border-t pt-6"><p className="text-sm text-muted-foreground">{t("spProfileCard.loading")}</p></div>;
    return (
      <Card className="border-none shadow-lg bg-gradient-to-br from-card to-muted/20">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{t("spProfileCard.loading")}</p>
        </CardContent>
      </Card>
    );
  }

  const sectionHeader = (
    <div className="flex flex-row items-start justify-between gap-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">{t("spProfileCard.heading")}</h2>
        <CardTitle className="text-lg flex items-center gap-2 font-medium">
          <Wrench className="h-5 w-5" />
          {t("spProfileCard.title")}
        </CardTitle>
        <CardDescription>{t("spProfileCard.description")}</CardDescription>
      </div>
      {!showForm && !profile && (
        <Button size="sm" onClick={openCreateForm}>
          <Plus className="h-4 w-4 me-1" /> {t("spProfileCard.createProfile")}
        </Button>
      )}
    </div>
  );

  const sectionContent = (
    <>
        {profile ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("orgDetails.licenseNumber")}</p>
                <p className="font-medium">{profile.licenseNumber ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("orgDetails.yearsExperience")}</p>
                <p className="font-medium">{profile.yearsExperience ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("orgDetails.area")}</p>
                <p className="font-medium">{profile.Area?.name ?? profile.areaId ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("orgDetails.city")}</p>
                <p className="font-medium">{profile.City?.name ?? profile.cityId ?? "—"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("orgDetails.street")}</p>
                <p className="font-medium">{profile.street ?? "—"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("orgDetails.serviceCategories")}</p>
                <p className="font-medium">
                  {Array.isArray(profile.serviceCategories) && profile.serviceCategories.length
                    ? profile.serviceCategories.join(", ")
                    : "—"}
                </p>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground italic">{t("spProfileCard.empty")}</p>
        )}
    </>
  );

  const formBody = (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t("spForm.licenseNumber")}</Label>
          <Input value={form.licenseNumber ?? ""} onChange={(e) => setForm((p) => ({ ...p, licenseNumber: e.target.value }))} placeholder={t("spForm.licenseNumberPlaceholder")} />
        </div>
        <div>
          <Label>{t("spForm.yearsExperience")}</Label>
          <Input type="number" min={0} value={form.yearsExperience ?? ""} onChange={(e) => setForm((p) => ({ ...p, yearsExperience: e.target.value ? Number(e.target.value) : undefined }))} placeholder={t("spForm.yearsExperiencePlaceholder")} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t("spForm.country")}</Label>
          <Select
            value={countryId != null ? String(countryId) : undefined}
            onValueChange={(v) => {
              setCountryId(Number(v));
              setGovernorateId(null);
              setForm((p) => ({ ...p, cityId: undefined, areaId: undefined }));
            }}
          >
            <SelectTrigger><SelectValue placeholder={t("spForm.select")} /></SelectTrigger>
            <SelectContent>
              {countries.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t("spForm.governorate")}</Label>
          <Select
            value={governorateId != null ? String(governorateId) : undefined}
            disabled={!countryId}
            onValueChange={(v) => {
              setGovernorateId(Number(v));
              setForm((p) => ({ ...p, cityId: undefined, areaId: undefined }));
            }}
          >
            <SelectTrigger><SelectValue placeholder={t("spForm.select")} /></SelectTrigger>
            <SelectContent>
              {governorates.map((g) => <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t("spForm.city")}</Label>
          <Select
            value={form.cityId != null ? String(form.cityId) : undefined}
            disabled={!governorateId}
            onValueChange={(v) => setForm((p) => ({ ...p, cityId: Number(v), areaId: undefined }))}
          >
            <SelectTrigger><SelectValue placeholder={t("spForm.select")} /></SelectTrigger>
            <SelectContent>
              {cities.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t("spForm.area")}</Label>
          <Select
            value={form.areaId != null ? String(form.areaId) : undefined}
            disabled={!form.cityId}
            onValueChange={(v) => setForm((p) => ({ ...p, areaId: Number(v) }))}
          >
            <SelectTrigger><SelectValue placeholder={t("spForm.select")} /></SelectTrigger>
            <SelectContent>
              {areas.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>{t("spForm.street")}</Label>
        <Input value={form.street ?? ""} onChange={(e) => setForm((p) => ({ ...p, street: e.target.value }))} placeholder={t("spForm.streetPlaceholder")} />
      </div>
      <div>
        <Label>{t("spForm.serviceCategories")}</Label>
        <Input value={Array.isArray(form.serviceCategories) ? form.serviceCategories.join(", ") : ""} onChange={(e) => setForm((p) => ({ ...p, serviceCategories: e.target.value ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean) : [] }))} placeholder={t("spForm.serviceCategoriesPlaceholder")} />
      </div>
    </div>
  );

  const formDialog = (
    <Dialog open={showForm} onOpenChange={setShowForm}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? t("spProfileCard.editDialogTitle") : t("spProfileCard.createDialogTitle")}</DialogTitle>
          <DialogDescription>
            {editing ? t("spProfileCard.editDialogDescription") : t("spProfileCard.createDialogDescription")}
          </DialogDescription>
        </DialogHeader>
        {formBody}
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowForm(false)}>{t("spProfileCard.cancel")}</Button>
          <Button onClick={submitForm} disabled={createMutation.isPending || updateMutation.isPending}>
            {editing
              ? (updateMutation.isPending ? t("spProfileCard.saving") : t("spProfileCard.update"))
              : (createMutation.isPending ? t("spProfileCard.creating") : t("spProfileCard.create"))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (embedded) {
    return (
      <>
        <div className="border-t pt-6 space-y-6">
          {sectionHeader}
          {sectionContent}
        </div>
        {formDialog}
      </>
    );
  }

  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-card to-muted/20">
      <CardHeader className="border-b bg-muted/30 pb-4">
        {sectionHeader}
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {sectionContent}
      </CardContent>
      {formDialog}
    </Card>
  );
}
