import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import useUpdateOrganization from "@/hooks/Organization/useUpdateOrganization";
import useCreateServiceProviderProfile from "@/hooks/Organization/useCreateServiceProviderProfile";
import useUpdateServiceProviderProfile from "@/hooks/Organization/useUpdateServiceProviderProfile";
import useGetCountries from "@/hooks/Location/useGetCountries";
import useGetGovernorates from "@/hooks/Location/useGetGovernorates";
import useGetCities from "@/hooks/Location/useGetCities";
import useGetAreas from "@/hooks/Location/useGetAreas";
import type {
  ServiceProviderProfileBody,
  OrganizationMeFullServiceProviderProfile,
} from "@/types/organization";

interface EditOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  organizationType?: string;
  organizationId?: number;
  initialServiceProviderProfile?: OrganizationMeFullServiceProviderProfile | null;
}

export default function EditOrganizationModal({
  isOpen,
  onClose,
  currentName,
  organizationType,
  organizationId,
  initialServiceProviderProfile,
}: EditOrganizationModalProps) {
  const { t } = useTranslation("profile");
  const [name, setName] = useState(currentName);
  const [spForm, setSpForm] = useState<ServiceProviderProfileBody>({
    licenseNumber: "",
    yearsExperience: undefined,
    areaId: undefined,
    cityId: undefined,
    street: "",
    serviceCategories: [],
  });
  const [countryId, setCountryId] = useState<number | null>(null);
  const [governorateId, setGovernorateId] = useState<number | null>(null);

  const updateOrgMutation = useUpdateOrganization();
  const createSPMutation = useCreateServiceProviderProfile();
  const updateSPMutation = useUpdateServiceProviderProfile();

  const countries = useGetCountries().data?.data ?? [];
  const governorates = useGetGovernorates(countryId).data?.data ?? [];
  const cities = useGetCities(governorateId).data?.data ?? [];
  const areas = useGetAreas(spForm.cityId ?? null).data?.data ?? [];

  const isServiceProvider = organizationType === "SERVICE_PROVIDER";
  const hasSPProfile = !!initialServiceProviderProfile?.id;

  useEffect(() => {
    setName(currentName);
  }, [currentName, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialServiceProviderProfile) {
      setSpForm({
        licenseNumber: initialServiceProviderProfile.licenseNumber ?? "",
        yearsExperience: initialServiceProviderProfile.yearsExperience ?? undefined,
        areaId: initialServiceProviderProfile.areaId ?? undefined,
        cityId: initialServiceProviderProfile.cityId ?? undefined,
        street: initialServiceProviderProfile.street ?? "",
        serviceCategories: initialServiceProviderProfile.serviceCategories ?? [],
      });
    } else {
      setSpForm({
        licenseNumber: "",
        yearsExperience: undefined,
        areaId: undefined,
        cityId: undefined,
        street: "",
        serviceCategories: [],
      });
    }
    setCountryId(null);
    setGovernorateId(null);
  }, [isOpen, initialServiceProviderProfile]);

  const nameChanged = name.trim() !== currentName;

  const saveSP = () => {
    if (!isServiceProvider || !organizationId) {
      onClose();
      return;
    }
    const body: ServiceProviderProfileBody = {
      ...spForm,
      serviceCategories: Array.isArray(spForm.serviceCategories) ? spForm.serviceCategories : [],
    };
    if (hasSPProfile) {
      updateSPMutation.mutate(
        { organizationId, body },
        {
          onSuccess: () => onClose(),
          onError: () => {},
        }
      );
    } else {
      createSPMutation.mutate(
        { organizationId, body },
        {
          onSuccess: () => onClose(),
          onError: () => {},
        }
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameChanged) {
      updateOrgMutation.mutate(
        { name: name.trim() },
        {
          onSuccess: () => {
            if (isServiceProvider) saveSP();
            else onClose();
          },
          onError: () => {},
        }
      );
    } else {
      if (isServiceProvider) saveSP();
      else onClose();
    }
  };

  const pending =
    updateOrgMutation.isPending || createSPMutation.isPending || updateSPMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("editModal.title")}</DialogTitle>
            <DialogDescription>{t("editModal.description")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* Organization Name */}
            <div className="grid gap-2">
              <Label htmlFor="org-name">{t("editModal.orgName")}</Label>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("editModal.orgNamePlaceholder")}
              />
            </div>

            {/* Service Provider Profile section */}
            {isServiceProvider && (
              <>
                <hr className="my-2" />
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold">{t("editModal.spSectionTitle")}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t("spForm.licenseNumber")}</Label>
                      <Input
                        value={spForm.licenseNumber ?? ""}
                        onChange={(e) =>
                          setSpForm((p) => ({ ...p, licenseNumber: e.target.value }))
                        }
                        placeholder={t("spForm.licenseNumberPlaceholder")}
                      />
                    </div>
                    <div>
                      <Label>{t("spForm.yearsExperience")}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={spForm.yearsExperience ?? ""}
                        onChange={(e) =>
                          setSpForm((p) => ({
                            ...p,
                            yearsExperience: e.target.value ? Number(e.target.value) : undefined,
                          }))
                        }
                        placeholder={t("spForm.yearsExperiencePlaceholder")}
                      />
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
                          setSpForm((p) => ({ ...p, cityId: undefined, areaId: undefined }));
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder={t("spForm.select")} /></SelectTrigger>
                        <SelectContent>
                          {countries.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                          ))}
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
                          setSpForm((p) => ({ ...p, cityId: undefined, areaId: undefined }));
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder={t("spForm.select")} /></SelectTrigger>
                        <SelectContent>
                          {governorates.map((g) => (
                            <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t("spForm.city")}</Label>
                      <Select
                        value={spForm.cityId != null ? String(spForm.cityId) : undefined}
                        disabled={!governorateId}
                        onValueChange={(v) =>
                          setSpForm((p) => ({ ...p, cityId: Number(v), areaId: undefined }))
                        }
                      >
                        <SelectTrigger><SelectValue placeholder={t("spForm.select")} /></SelectTrigger>
                        <SelectContent>
                          {cities.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{t("spForm.area")}</Label>
                      <Select
                        value={spForm.areaId != null ? String(spForm.areaId) : undefined}
                        disabled={!spForm.cityId}
                        onValueChange={(v) =>
                          setSpForm((p) => ({ ...p, areaId: Number(v) }))
                        }
                      >
                        <SelectTrigger><SelectValue placeholder={t("spForm.select")} /></SelectTrigger>
                        <SelectContent>
                          {areas.map((a) => (
                            <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>{t("spForm.street")}</Label>
                    <Input
                      value={spForm.street ?? ""}
                      onChange={(e) => setSpForm((p) => ({ ...p, street: e.target.value }))}
                      placeholder={t("spForm.streetPlaceholder")}
                    />
                  </div>
                  <div>
                    <Label>{t("spForm.serviceCategories")}</Label>
                    <Input
                      value={
                        Array.isArray(spForm.serviceCategories)
                          ? spForm.serviceCategories.join(", ")
                          : ""
                      }
                      onChange={(e) =>
                        setSpForm((p) => ({
                          ...p,
                          serviceCategories: e.target.value
                            ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                            : [],
                        }))
                      }
                      placeholder={t("spForm.serviceCategoriesPlaceholder")}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              {t("editModal.cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? t("editModal.saving") : t("editModal.saveChanges")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
