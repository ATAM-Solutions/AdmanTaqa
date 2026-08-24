import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ChevronDown } from "lucide-react";
import useCreateBranch from "@/hooks/Branches/useCreateBranch";
import useGetFuelStationTypes from "@/hooks/Branches/useGetFuelStationTypes";
import useGetFuelTypes from "@/hooks/Branches/useGetFuelTypes";
import useGetCountries from "@/hooks/Location/useGetCountries";
import useGetGovernorates from "@/hooks/Location/useGetGovernorates";
import useGetCities from "@/hooks/Location/useGetCities";
import useGetAreas from "@/hooks/Location/useGetAreas";
import useGetAreaDetails, { getAreaDetails } from "@/hooks/Location/useGetAreaDetails";
import BranchLocationMap from "./BranchLocationMap";
import type { CreateBranchBody } from "@/hooks/Branches/useCreateBranch";

const WORKING_DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

type DayHours = { is24h: boolean; open: string; close: string };
const defaultDayHours = (): DayHours => ({ is24h: false, open: "", close: "" });
const initialWorkingHours = () =>
  Object.fromEntries(WORKING_DAYS.map((d) => [d, defaultDayHours()]));

export type AddBranchFormProps = {
  onSuccess?: (message?: string, branchId?: number) => void;
  onCancel?: () => void;
  showCancel?: boolean;
  submitLabel?: string;
};

export default function AddBranchForm({
  onSuccess,
  onCancel,
  showCancel = true,
  submitLabel,
}: AddBranchFormProps) {
  const { t } = useTranslation("branches");
  const queryClient = useQueryClient();
  const mutation = useCreateBranch();
  const { data: stationTypes = [], isLoading: loadingStationTypes } = useGetFuelStationTypes();
  const { data: fuelTypes = [], isLoading: loadingFuelTypes } = useGetFuelTypes();

  const [countryId, setCountryId] = useState("");
  const [governorateId, setGovernorateId] = useState("");
  const [cityId, setCityId] = useState("");
  const [selectedAreaId, setSelectedAreaId] = useState("");

  const { data: countriesRes } = useGetCountries();
  const { data: governoratesRes, isLoading: loadingGovernorates } = useGetGovernorates(
    countryId ? parseInt(countryId, 10) : null
  );
  const { data: citiesRes, isLoading: loadingCities } = useGetCities(
    governorateId ? parseInt(governorateId, 10) : null
  );
  const { data: areasRes, isLoading: loadingAreas } = useGetAreas(
    cityId ? parseInt(cityId, 10) : null
  );
  const { data: areaDetails } = useGetAreaDetails(
    selectedAreaId ? parseInt(selectedAreaId, 10) : null
  );

  const countries = countriesRes?.data ?? [];
  const governorates = governoratesRes?.data ?? [];
  const cities = citiesRes?.data ?? [];
  const areas = areasRes?.data ?? [];

  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [stationTypeId, setStationTypeId] = useState("");
  const [street, setStreet] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [workingHoursByDay, setWorkingHoursByDay] = useState<Record<string, DayHours>>(
    initialWorkingHours()
  );
  const [address, setAddress] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [managerPhone, setManagerPhone] = useState("");
  const [selectedFuelTypeIds, setSelectedFuelTypeIds] = useState<number[]>([]);
  const [fuelTypesSelectOpen, setFuelTypesSelectOpen] = useState(false);
  const fuelTypesSelectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fuelTypesSelectRef.current && !fuelTypesSelectRef.current.contains(e.target as Node)) {
        setFuelTypesSelectOpen(false);
      }
    };
    if (fuelTypesSelectOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [fuelTypesSelectOpen]);

  const applyAreaCoordinates = (areaId: string) => {
    const id = parseInt(areaId, 10);
    if (Number.isNaN(id)) return;
    queryClient
      .fetchQuery({ queryKey: ["area", id], queryFn: () => getAreaDetails(id) })
      .then((data) => {
        if (data?.latitude != null && data?.longitude != null) {
          setLatitude(String(data.latitude));
          setLongitude(String(data.longitude));
        }
      })
      .catch(() => {});
  };

  const toggleFuelType = (id: number) => {
    setSelectedFuelTypeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const setDayHours = (day: string, patch: Partial<DayHours>) => {
    setWorkingHoursByDay((prev) => ({
      ...prev,
      [day]: { ...prev[day], ...patch },
    }));
  };

  const resetForm = () => {
    setNameEn("");
    setNameAr("");
    setLicenseNumber("");
    setStationTypeId("");
    setCountryId("");
    setGovernorateId("");
    setCityId("");
    setSelectedAreaId("");
    setStreet("");
    setLatitude("");
    setLongitude("");
    setWorkingHoursByDay(initialWorkingHours());
    setAddress("");
    setOwnerName("");
    setOwnerEmail("");
    setManagerName("");
    setManagerEmail("");
    setManagerPhone("");
    setSelectedFuelTypeIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const stationTypeIdNum = stationTypeId ? parseInt(stationTypeId, 10) : NaN;
    const areaIdNum = selectedAreaId ? parseInt(selectedAreaId, 10) : NaN;
    if (!selectedAreaId || isNaN(areaIdNum)) {
      toast.error(t("toasts.selectLocationRequired"));
      return;
    }
    if (!stationTypeId || isNaN(stationTypeIdNum)) {
      toast.error(t("toasts.selectStationTypeRequired"));
      return;
    }

    const workingHours: CreateBranchBody["workingHours"] = {};
    WORKING_DAYS.forEach((day) => {
      const d = workingHoursByDay[day];
      if (!d) return;
      if (d.is24h) {
        workingHours[day] = { open: "24h" };
      } else {
        workingHours[day] = {
          open: d.open || " ",
          close: d.close || " ",
        };
      }
    });

    if (selectedFuelTypeIds.length === 0) {
      toast.error(t("toasts.selectFuelTypeRequired"));
      return;
    }

    const body: CreateBranchBody = {
      nameEn: nameEn.trim(),
      nameAr: nameAr.trim(),
      licenseNumber: licenseNumber.trim() || undefined,
      stationTypeId: stationTypeIdNum,
      areaId: areaIdNum,
      fuelTypeIds: selectedFuelTypeIds,
      street: street.trim() || undefined,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      workingHours,
      address: address.trim(),
      ownerName: ownerName.trim() || undefined,
      ownerEmail: ownerEmail.trim() || undefined,
      managerName: managerName.trim() || undefined,
      managerEmail: managerEmail.trim() || undefined,
      managerPhone: managerPhone.trim() || undefined,
    };

    try {
      const result = await mutation.mutateAsync(body);
      toast.success(result.message ?? t("toasts.branchCreated"));
      resetForm();
      onSuccess?.(result.message, result.data?.id);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      toast.error(msg ?? t("toasts.branchCreateFailed"));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nameEn">{t("fields.nameEn")}</Label>
          <Input
            id="nameEn"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            placeholder={t("fields.nameEnPlaceholder")}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nameAr">{t("fields.nameAr")}</Label>
          <Input
            id="nameAr"
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            placeholder={t("fields.nameArPlaceholder")}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="licenseNumber">{t("fields.licenseNumber")}</Label>
          <Input
            id="licenseNumber"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            placeholder={t("fields.licenseNumberPlaceholder")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stationTypeId">{t("fields.stationType")}</Label>
          <Select
            value={stationTypeId}
            onValueChange={setStationTypeId}
            disabled={loadingStationTypes}
          >
            <SelectTrigger id="stationTypeId">
              <SelectValue placeholder={loadingStationTypes ? t("fields.loading") : t("fields.selectStationType")} />
            </SelectTrigger>
            <SelectContent>
              {stationTypes.map((st) => (
                <SelectItem key={st.id} value={String(st.id)}>
                  {st.name} ({st.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t("fields.locationAreaLabel")}</Label>
        <p className="text-xs text-muted-foreground">{t("fields.locationAreaHint")}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("fields.country")}</Label>
            <Select
              value={countryId}
              onValueChange={(v) => {
                setCountryId(v);
                setGovernorateId("");
                setCityId("");
                setSelectedAreaId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("fields.selectCountry")} />
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
            <Label>{t("fields.governorate")}</Label>
            <Select
              value={governorateId}
              onValueChange={(v) => {
                setGovernorateId(v);
                setCityId("");
                setSelectedAreaId("");
              }}
              disabled={!countryId || loadingGovernorates}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !countryId ? t("fields.selectCountryFirst") : loadingGovernorates ? t("fields.loading") : t("fields.selectGovernorate")
                  }
                />
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
          <div className="space-y-2">
            <Label>{t("fields.city")}</Label>
            <Select
              value={cityId}
              onValueChange={(v) => {
                setCityId(v);
                setSelectedAreaId("");
              }}
              disabled={!governorateId || loadingCities}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !governorateId ? t("fields.selectGovernorateFirst") : loadingCities ? t("fields.loading") : t("fields.selectCity")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {cities.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("fields.area")}</Label>
            <Select
              value={selectedAreaId}
              onValueChange={(v) => {
                setSelectedAreaId(v);
                applyAreaCoordinates(v);
              }}
              disabled={!cityId || loadingAreas}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !cityId ? t("fields.selectCityFirst") : loadingAreas ? t("fields.loading") : t("fields.selectArea")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {areas.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.name} ({a.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="street">{t("fields.street")}</Label>
        <Input
          id="street"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          placeholder={t("fields.streetPlaceholder")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">{t("fields.address")}</Label>
        <Input
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={t("fields.addressPlaceholder")}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>{t("fields.coordinatesLabel")}</Label>
        <p className="text-xs text-muted-foreground">{t("fields.coordinatesHint")}</p>
        <BranchLocationMap
          latitude={latitude}
          longitude={longitude}
          onLocationSelect={(lat, lng) => {
            setLatitude(String(lat));
            setLongitude(String(lng));
          }}
          center={
            areaDetails?.latitude != null && areaDetails?.longitude != null
              ? [Number(areaDetails.latitude), Number(areaDetails.longitude)]
              : undefined
          }
          height="260px"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="latitude">{t("fields.latitude")}</Label>
          <Input
            id="latitude"
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            placeholder="30.0444"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="longitude">{t("fields.longitude")}</Label>
          <Input
            id="longitude"
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            placeholder="31.2357"
          />
        </div>
      </div>
      <div className="space-y-3">
        <Label>{t("fields.workingHours")}</Label>
        <p className="text-xs text-muted-foreground">{t("fields.workingHoursHint")}</p>
        <div className="rounded-md border p-3 space-y-2 max-h-[220px] overflow-y-auto">
          {WORKING_DAYS.map((day) => {
            const d = workingHoursByDay[day] ?? defaultDayHours();
            return (
              <div
                key={day}
                className="grid grid-cols-[auto_1fr_1fr_1fr] gap-2 items-center text-sm"
              >
                <span className="font-medium min-w-[70px]">{t(`days.${day}`)}</span>
                <div className="flex items-center gap-1">
                  <Checkbox
                    id={`wh-24h-${day}`}
                    checked={d.is24h}
                    onCheckedChange={(checked) =>
                      setDayHours(day, { is24h: !!checked })
                    }
                  />
                  <label htmlFor={`wh-24h-${day}`} className="cursor-pointer">
                    {t("fields.twentyFourHours")}
                  </label>
                </div>
                <div className="flex flex-col gap-0.5">
                  <Label className="text-xs">{t("fields.open")}</Label>
                  <Input
                    type="time"
                    value={d.open}
                    onChange={(e) => setDayHours(day, { open: e.target.value })}
                    disabled={d.is24h}
                    className="h-8"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <Label className="text-xs">{t("fields.close")}</Label>
                  <Input
                    type="time"
                    value={d.close}
                    onChange={(e) => setDayHours(day, { close: e.target.value })}
                    disabled={d.is24h}
                    className="h-8"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ownerName">{t("fields.ownerName")}</Label>
          <Input
            id="ownerName"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder={t("fields.ownerNamePlaceholder")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ownerEmail">{t("fields.ownerEmail")}</Label>
          <Input
            id="ownerEmail"
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="owner@example.com"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="managerName">{t("fields.managerName")}</Label>
          <Input
            id="managerName"
            value={managerName}
            onChange={(e) => setManagerName(e.target.value)}
            placeholder={t("fields.managerNamePlaceholder")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="managerEmail">{t("fields.managerEmail")}</Label>
          <Input
            id="managerEmail"
            type="email"
            value={managerEmail}
            onChange={(e) => setManagerEmail(e.target.value)}
            placeholder="manager@example.com"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="managerPhone">{t("fields.managerPhone")}</Label>
        <Input
          id="managerPhone"
          dir="ltr"
          value={managerPhone}
          onChange={(e) => setManagerPhone(e.target.value)}
          placeholder="+201234567890"
        />
      </div>
      <div className="space-y-2" ref={fuelTypesSelectRef}>
        <Label>{t("fields.fuelTypes")}</Label>
        {loadingFuelTypes ? (
          <p className="text-sm text-muted-foreground">{t("fields.loadingFuelTypes")}</p>
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={() => setFuelTypesSelectOpen((o) => !o)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <span className={selectedFuelTypeIds.length ? "text-foreground" : "text-muted-foreground"}>
                {selectedFuelTypeIds.length
                  ? fuelTypes
                      .filter((ft) => selectedFuelTypeIds.includes(ft.id))
                      .map((ft) => ft.name)
                      .join(", ")
                  : t("fields.selectFuelTypes")}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </button>
            {fuelTypesSelectOpen && (
              <div className="absolute z-50 mt-1 w-full min-w-[8rem] overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md max-h-60 p-1">
                {fuelTypes.map((ft) => (
                  <div
                    key={ft.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleFuelType(ft.id)}
                    onKeyDown={(e) => e.key === "Enter" && toggleFuelType(ft.id)}
                    className="relative flex cursor-pointer select-none items-center rounded-sm py-2 ps-8 pe-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                  >
                    <span className="absolute start-2 flex h-3.5 w-3.5 items-center justify-center">
                      {selectedFuelTypeIds.includes(ft.id) ? (
                        <span className="h-4 w-4 rounded border border-primary bg-primary" />
                      ) : (
                        <span className="h-4 w-4 rounded border border-muted-foreground" />
                      )}
                    </span>
                    {ft.name} ({ft.code})
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground">{t("fields.selectAtLeastOneFuelType")}</p>
      </div>
      <div className="flex gap-2 pt-4">
        {showCancel && onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={mutation.isPending}
          >
            {t("actions.cancel")}
          </Button>
        )}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <>
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
              {t("actions.creating")}
            </>
          ) : (
            submitLabel ?? t("actions.createBranch")
          )}
        </Button>
      </div>
    </form>
  );
}
