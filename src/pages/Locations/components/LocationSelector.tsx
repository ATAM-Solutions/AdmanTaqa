import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MapPin, Globe, Landmark, Building, Navigation, EllipsisVertical, Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type LocationLevel = "country" | "governorate" | "city" | "area";

interface LocationItemShape {
    id: number;
    name: string;
    code: string;
}

interface LocationSelectorProps {
    // Data
    countries: LocationItemShape[];
    governorates: LocationItemShape[];
    cities: LocationItemShape[];
    areas: LocationItemShape[];
    // Loading states
    loadingCountries: boolean;
    loadingGovs: boolean;
    loadingCities: boolean;
    loadingAreas: boolean;
    // Selection IDs
    selectedCountryId: string;
    selectedGovernorateId: string;
    selectedCityId: string;
    selectedAreaId: string;
    // Setters
    setSelectedCountryId: (id: string) => void;
    setSelectedGovernorateId: (id: string) => void;
    setSelectedCityId: (id: string) => void;
    setSelectedAreaId: (id: string) => void;
    // Selected names for summary
    selectedCountry?: string;
    selectedGov?: string;
    selectedCity?: string;
    selectedArea?: string;
    // CRUD from selector menu
    onCreateLevel?: (level: LocationLevel) => void;
    onEditLevel?: (level: LocationLevel, item: LocationItemShape) => void;
    onDeleteLevel?: (level: LocationLevel, item: { id: number; name: string }) => void;
}

export default function LocationSelector({
    countries,
    governorates,
    cities,
    areas,
    loadingCountries,
    loadingGovs,
    loadingCities,
    loadingAreas,
    selectedCountryId,
    selectedGovernorateId,
    selectedCityId,
    selectedAreaId,
    setSelectedCountryId,
    setSelectedGovernorateId,
    setSelectedCityId,
    setSelectedAreaId,
    selectedCountry,
    selectedGov,
    selectedCity,
    selectedArea,
    onCreateLevel,
    onEditLevel,
    onDeleteLevel,
}: LocationSelectorProps) {
    const { t } = useTranslation("locations");
    const [openMenu, setOpenMenu] = useState<LocationLevel | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const triggerRefs = useRef<Record<LocationLevel, HTMLButtonElement | null>>({ country: null, governorate: null, city: null, area: null });

    useEffect(() => {
        if (openMenu === null) return;
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (menuRef.current?.contains(target)) return;
            if (triggerRefs.current[openMenu]?.contains(target)) return;
            setOpenMenu(null);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [openMenu]);

    const renderLevelMenu = (level: LocationLevel, selectedId: string, items: LocationItemShape[]) => {
        const selectedItem = items.find((i) => i.id.toString() === selectedId);
        const isOpen = openMenu === level;
        return (
            <div className="relative">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={(e) => { e.preventDefault(); setOpenMenu(isOpen ? null : level); }}
                    ref={(el) => { triggerRefs.current[level] = el; }}
                    aria-label={t("selector.menu.ariaLabel", { level: t(`levels.${level}`) })}
                >
                    <EllipsisVertical size={16} />
                </Button>
                {isOpen && (
                    <div
                        ref={menuRef}
                        className="absolute end-0 top-full z-50 mt-1 min-w-[160px] rounded-md border bg-popover py-1 text-popover-foreground shadow-md"
                    >
                        <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                            onClick={() => { onCreateLevel?.(level); setOpenMenu(null); }}
                        >
                            <Plus className="h-4 w-4" /> {t("selector.menu.create")}
                        </button>
                        <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted disabled:opacity-50 disabled:pointer-events-none"
                            disabled={!selectedItem}
                            onClick={() => { if (selectedItem) { onEditLevel?.(level, selectedItem); setOpenMenu(null); } }}
                        >
                            <Pencil className="h-4 w-4" /> {t("selector.menu.update")}
                        </button>
                        <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-destructive disabled:opacity-50 disabled:pointer-events-none"
                            disabled={!selectedItem}
                            onClick={() => { if (selectedItem) { onDeleteLevel?.(level, selectedItem); setOpenMenu(null); } }}
                        >
                            <Trash2 className="h-4 w-4" /> {t("selector.menu.delete")}
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Selection Card */}
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="text-xl font-semibold flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        {t("selector.selectionTitle")}
                    </CardTitle>
                    <CardDescription>{t("selector.selectionDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Country checkboxes */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <Label className="flex items-center gap-2">
                                <Globe className="h-4 w-4 text-muted-foreground" />
                                {t("levels.country")}
                            </Label>
                            {renderLevelMenu("country", selectedCountryId, countries)}
                        </div>
                        <div className={cn("grid grid-cols-2 gap-2 rounded-md border p-2 space-y-1 max-h-[180px] overflow-y-auto", loadingCountries && "opacity-60")}>
                            {loadingCountries ? (
                                <p className="text-sm text-muted-foreground py-2">{t("selector.loadingCountries")}</p>
                            ) : countries.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-2">{t("selector.noCountries")}</p>
                            ) : (
                                countries.map((country) => (
                                    <label
                                        key={country.id}
                                        className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 cursor-pointer text-sm"
                                    >
                                        <Checkbox
                                            checked={selectedCountryId === country.id.toString()}
                                            onCheckedChange={(checked) => {
                                                const id = country.id.toString();
                                                if (checked) {
                                                    setSelectedCountryId(id);
                                                    setSelectedGovernorateId("");
                                                    setSelectedCityId("");
                                                    setSelectedAreaId("");
                                                } else if (selectedCountryId === id) {
                                                    setSelectedCountryId("");
                                                    setSelectedGovernorateId("");
                                                    setSelectedCityId("");
                                                    setSelectedAreaId("");
                                                }
                                            }}
                                        />
                                        <span>{country.name}{country.code ? ` (${country.code})` : ""}</span>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Governorate checkboxes */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <Label className="flex items-center gap-2">
                                <Landmark className="h-4 w-4 text-muted-foreground" />
                                {t("levels.governorate")}
                            </Label>
                            {selectedCountryId ? renderLevelMenu("governorate", selectedGovernorateId, governorates) : null}
                        </div>
                        <div className={cn("grid grid-cols-2 gap-2 rounded-md border-b p-2 space-y-1 max-h-[180px] overflow-y-auto", (!selectedCountryId || loadingGovs) && "opacity-60")}>
                            {!selectedCountryId ? (
                                <p className="text-sm text-muted-foreground py-2">{t("selector.selectCountryFirst")}</p>
                            ) : loadingGovs ? (
                                <p className="text-sm text-muted-foreground py-2">{t("selector.loadingGovernorates")}</p>
                            ) : governorates.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-2">{t("selector.noGovernorates")}</p>
                            ) : (
                                governorates.map((gov) => (
                                    <label
                                        key={gov.id}
                                        className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 cursor-pointer text-sm"
                                    >
                                        <Checkbox
                                            checked={selectedGovernorateId === gov.id.toString()}
                                            onCheckedChange={(checked) => {
                                                const id = gov.id.toString();
                                                if (checked) {
                                                    setSelectedGovernorateId(id);
                                                    setSelectedCityId("");
                                                    setSelectedAreaId("");
                                                } else if (selectedGovernorateId === id) {
                                                    setSelectedGovernorateId("");
                                                    setSelectedCityId("");
                                                    setSelectedAreaId("");
                                                }
                                            }}
                                        />
                                        <span>{gov.name}</span>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>

                    {/* City checkboxes */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <Label className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-muted-foreground" />
                                {t("levels.city")}
                            </Label>
                            {selectedGovernorateId ? renderLevelMenu("city", selectedCityId, cities) : null}
                        </div>
                        <div className={cn("grid grid-cols-2 gap-2 rounded-md border-b p-2 space-y-1 max-h-[180px] overflow-y-auto", (!selectedGovernorateId || loadingCities) && "opacity-60")}>
                            {!selectedGovernorateId ? (
                                <p className="text-sm text-muted-foreground py-2">{t("selector.selectGovernorateFirst")}</p>
                            ) : loadingCities ? (
                                <p className="text-sm text-muted-foreground py-2">{t("selector.loadingCities")}</p>
                            ) : cities.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-2">{t("selector.noCities")}</p>
                            ) : (
                                cities.map((city) => (
                                    <label
                                        key={city.id}
                                        className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 cursor-pointer text-sm"
                                    >
                                        <Checkbox
                                            checked={selectedCityId === city.id.toString()}
                                            onCheckedChange={(checked) => {
                                                const id = city.id.toString();
                                                if (checked) {
                                                    setSelectedCityId(id);
                                                    setSelectedAreaId("");
                                                } else if (selectedCityId === id) {
                                                    setSelectedCityId("");
                                                    setSelectedAreaId("");
                                                }
                                            }}
                                        />
                                        <span>{city.name}</span>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Area checkboxes */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <Label className="flex items-center gap-2">
                                <Navigation className="h-4 w-4 text-muted-foreground" />
                                {t("levels.area")}
                            </Label>
                            {selectedCityId ? renderLevelMenu("area", selectedAreaId, areas) : null}
                        </div>
                        <div className={cn("grid grid-cols-2 gap-2 rounded-md border-b p-2 space-y-1 max-h-[180px] overflow-y-auto", (!selectedCityId || loadingAreas) && "opacity-60")}>
                            {!selectedCityId ? (
                                <p className="text-sm text-muted-foreground py-2">{t("selector.selectCityFirst")}</p>
                            ) : loadingAreas ? (
                                <p className="text-sm text-muted-foreground py-2">{t("selector.loadingAreas")}</p>
                            ) : areas.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-2">{t("selector.noAreas")}</p>
                            ) : (
                                areas.map((area) => (
                                    <label
                                        key={area.id}
                                        className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 cursor-pointer text-sm"
                                    >
                                        <Checkbox
                                            checked={selectedAreaId === area.id.toString()}
                                            onCheckedChange={(checked) => {
                                                const id = area.id.toString();
                                                if (checked) setSelectedAreaId(id);
                                                else if (selectedAreaId === id) setSelectedAreaId("");
                                            }}
                                        />
                                        <span>{area.name}</span>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Card */}
            <div className="space-y-4">
                <Card className="bg-muted/30 border-dashed w-3/4">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold">{t("selector.detailsTitle")}</CardTitle>
                        <CardDescription>{t("selector.detailsDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-muted-foreground uppercase">{t("selector.path")}</span>
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                    {selectedCountry ? <span className="font-semibold text-primary">{selectedCountry}</span> : <Skeleton className="h-4 w-20" />}
                                    {selectedGov && <><span className="text-muted-foreground">/</span> <span className="font-semibold">{selectedGov}</span></>}
                                    {selectedCity && <><span className="text-muted-foreground">/</span> <span className="font-semibold">{selectedCity}</span></>}
                                    {selectedArea && <><span className="text-muted-foreground">/</span> <span className="font-semibold text-green-600 dark:text-green-400">{selectedArea}</span></>}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    {selectedArea && (
                        <CardFooter>
                            <div className="w-full p-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/20 text-green-700 dark:text-green-400 text-xs flex items-center gap-2">
                                <Navigation className="h-3.5 w-3.5 shrink-0" />
                                {t("selector.fullyIdentified")}
                            </div>
                        </CardFooter>
                    )}
                </Card>
            </div>
        </div>
    );
}
