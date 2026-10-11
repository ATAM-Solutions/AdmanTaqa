import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GeographyCombobox from "@/components/GeographyCombobox";
import useGetCountries from "@/hooks/Location/useGetCountries";
import { EMPTY_GEOGRAPHY, geoName, type GeographySelection } from "@/lib/geography";
import type { GeographyNode } from "@/types/location";

export interface GeographyLabels {
  region?: string;
  city?: string;
  district?: string;
}

interface GeographyFieldsProps {
  /** "region" = Region only; "city" = Region → City (companies); "district" = Region → City → District (stations). */
  depth: "region" | "city" | "district";
  value: GeographySelection;
  onChange: (next: GeographySelection) => void;
  /** Names of already-saved values (edit mode), shown before the lists load. */
  initialLabels?: GeographyLabels;
  /** Marks the labels with "*" (the form schema enforces it). */
  required?: boolean;
  errors?: { region?: string; city?: string; district?: string };
  className?: string;
}

/**
 * Region → City → District cascade. Labels match what the lists actually contain (a region is a
 * منطقة, never "governorate"; a district is a حي, never "area"). Changing a parent resets every child.
 */
export default function GeographyFields({ depth, value, onChange, initialLabels, required, errors, className }: GeographyFieldsProps) {
  const { t, i18n } = useTranslation("geography");
  const { data: countriesRes, isLoading: loadingCountries, isError: countriesError, refetch } = useGetCountries();
  const countries = useMemo(() => countriesRes?.data ?? [], [countriesRes]);
  const [countryId, setCountryId] = useState<number | null>(null);
  const [labels, setLabels] = useState<GeographyLabels>(initialLabels ?? {});

  useEffect(() => {
    setLabels(initialLabels ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLabels?.region, initialLabels?.city, initialLabels?.district]);

  useEffect(() => {
    if (countries.length === 1 && countryId == null) setCountryId(countries[0].id);
  }, [countries, countryId]);

  const star = required ? " *" : "";
  const regionParent = countryId;

  return (
    <div className={className ?? "grid grid-cols-1 gap-4 md:grid-cols-2"}>
      <div className="space-y-2">
        <Label>{t("country")}</Label>
        {countriesError ? (
          <div className="flex items-center justify-between gap-2 rounded-md border border-destructive/50 px-3 py-2 text-sm text-destructive" role="alert">
            <span>{t("loadFailed.country")}</span>
            <button type="button" className="underline" onClick={() => refetch()}>
              {t("retry")}
            </button>
          </div>
        ) : (
          <Select
            value={countryId != null ? String(countryId) : ""}
            onValueChange={(v) => {
              setCountryId(Number(v));
              setLabels({});
              onChange(EMPTY_GEOGRAPHY);
            }}
            disabled={loadingCountries || countries.length <= 1}
          >
            <SelectTrigger>
              <SelectValue placeholder={loadingCountries ? t("loading") : t("placeholder.country")} />
            </SelectTrigger>
            <SelectContent>
              {countries.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {geoName(c, i18n.language)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-2">
        <Label>
          {t("region")}
          {star}
        </Label>
        <GeographyCombobox
          level="region"
          parentId={regionParent}
          value={value.regionId}
          selectedLabel={labels.region}
          invalid={!!errors?.region}
          onSelect={(n: GeographyNode) => {
            setLabels({ region: geoName(n, i18n.language) });
            onChange({ regionId: n.id, cityId: null, areaId: null });
          }}
        />
        {errors?.region ? <p className="text-sm font-medium text-destructive">{errors.region}</p> : null}
      </div>

      {depth !== "region" ? (
        <div className="space-y-2">
          <Label>
            {t("city")}
            {star}
          </Label>
          <GeographyCombobox
            level="city"
            parentId={value.regionId}
            value={value.cityId}
            selectedLabel={labels.city}
            invalid={!!errors?.city}
            onSelect={(n) => {
              setLabels((l) => ({ region: l.region, city: geoName(n, i18n.language) }));
              onChange({ regionId: value.regionId, cityId: n.id, areaId: null });
            }}
          />
          {errors?.city ? <p className="text-sm font-medium text-destructive">{errors.city}</p> : null}
        </div>
      ) : null}

      {depth === "district" ? (
        <div className="space-y-2">
          <Label>
            {t("district")}
            {star}
          </Label>
          <GeographyCombobox
            level="district"
            parentId={value.cityId}
            value={value.areaId}
            selectedLabel={labels.district}
            invalid={!!errors?.district}
            onSelect={(n) => {
              setLabels((l) => ({ ...l, district: geoName(n, i18n.language) }));
              onChange({ ...value, areaId: n.id });
            }}
          />
          {errors?.district ? <p className="text-sm font-medium text-destructive">{errors.district}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
