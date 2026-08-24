import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import useGetCountries from "@/hooks/Location/useGetCountries";
import useGetGovernorates from "@/hooks/Location/useGetGovernorates";
import useGetCities from "@/hooks/Location/useGetCities";
import useGetAreas from "@/hooks/Location/useGetAreas";
import useCreateCountry from "@/hooks/Location/useCreateCountry";
import useUpdateCountry from "@/hooks/Location/useUpdateCountry";
import useDeleteCountry from "@/hooks/Location/useDeleteCountry";
import useCreateGovernorate from "@/hooks/Location/useCreateGovernorate";
import useUpdateGovernorate from "@/hooks/Location/useUpdateGovernorate";
import useDeleteGovernorate from "@/hooks/Location/useDeleteGovernorate";
import useCreateCity from "@/hooks/Location/useCreateCity";
import useUpdateCity from "@/hooks/Location/useUpdateCity";
import useDeleteCity from "@/hooks/Location/useDeleteCity";
import useCreateArea from "@/hooks/Location/useCreateArea";
import useUpdateArea from "@/hooks/Location/useUpdateArea";
import useDeleteArea from "@/hooks/Location/useDeleteArea";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import LocationSelector from "./components/LocationSelector";
// import LocationManageCard from "./components/LocationManageCard";
import LocationFormDialog, { type LocationLevel, type LocationFormValues } from "./components/LocationFormDialog";
import LocationDeleteDialog from "./components/LocationDeleteDialog";
import { PageHeader } from "@/components/patterns/PageHeader";

export default function Locations() {
  const { t } = useTranslation("locations");
  const [selectedCountryId, setSelectedCountryId] = useState<string>("");
  const [selectedGovernorateId, setSelectedGovernorateId] = useState<string>("");
  const [selectedCityId, setSelectedCityId] = useState<string>("");
  const [selectedAreaId, setSelectedAreaId] = useState<string>("");

  // Form dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formLevel, setFormLevel] = useState<LocationLevel>("country");
  const [formInitialValues, setFormInitialValues] = useState<LocationFormValues | undefined>();
  const [editingItemId, setEditingItemId] = useState<number | null>(null);

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLevel, setDeleteLevel] = useState<LocationLevel>("country");
  const [deleteItem, setDeleteItem] = useState<{ id: number; name: string } | null>(null);

  // Queries
  const { data: countriesRes, isLoading: loadingCountries } = useGetCountries();
  const { data: governoratesRes, isLoading: loadingGovs } = useGetGovernorates(
    selectedCountryId ? parseInt(selectedCountryId) : null
  );
  const { data: citiesRes, isLoading: loadingCities } = useGetCities(
    selectedGovernorateId ? parseInt(selectedGovernorateId) : null
  );
  const { data: areasRes, isLoading: loadingAreas } = useGetAreas(
    selectedCityId ? parseInt(selectedCityId) : null
  );

  // Mutations
  const createCountryMutation = useCreateCountry();
  const updateCountryMutation = useUpdateCountry();
  const deleteCountryMutation = useDeleteCountry();
  const createGovernorateMutation = useCreateGovernorate();
  const updateGovernorateMutation = useUpdateGovernorate();
  const deleteGovernorateMutation = useDeleteGovernorate();
  const createCityMutation = useCreateCity();
  const updateCityMutation = useUpdateCity();
  const deleteCityMutation = useDeleteCity();
  const createAreaMutation = useCreateArea();
  const updateAreaMutation = useUpdateArea();
  const deleteAreaMutation = useDeleteArea();

  const countries = countriesRes?.data || [];
  const governorates = governoratesRes?.data || [];
  const cities = citiesRes?.data || [];
  const areas = areasRes?.data || [];

  const selectedCountry = countries.find((c) => c.id.toString() === selectedCountryId)?.name;
  const selectedGov = governorates.find((g) => g.id.toString() === selectedGovernorateId)?.name;
  const selectedCity = cities.find((c) => c.id.toString() === selectedCityId)?.name;
  const selectedArea = areas.find((a) => a.id.toString() === selectedAreaId)?.name;

  const handleReset = () => {
    setSelectedCountryId("");
    setSelectedGovernorateId("");
    setSelectedCityId("");
    setSelectedAreaId("");
  };

  const submitting =
    createCountryMutation.isPending ||
    updateCountryMutation.isPending ||
    deleteCountryMutation.isPending ||
    createGovernorateMutation.isPending ||
    updateGovernorateMutation.isPending ||
    deleteGovernorateMutation.isPending ||
    createCityMutation.isPending ||
    updateCityMutation.isPending ||
    deleteCityMutation.isPending ||
    createAreaMutation.isPending ||
    updateAreaMutation.isPending ||
    deleteAreaMutation.isPending;

  const openCreateForm = (level: LocationLevel) => {
    setFormLevel(level);
    setFormMode("create");
    setFormInitialValues(undefined);
    setEditingItemId(null);
    setFormOpen(true);
  };

  const openEditForm = (level: LocationLevel, item: { id: number; name: string; code: string }) => {
    setFormLevel(level);
    setFormMode("edit");
    setFormInitialValues({ name: item.name, code: item.code });
    setEditingItemId(item.id);
    setFormOpen(true);
  };

  const openDeleteConfirm = (level: LocationLevel, item: { id: number; name: string }) => {
    setDeleteLevel(level);
    setDeleteItem(item);
    setDeleteOpen(true);
  };

  const handleFormSubmit = async (values: LocationFormValues) => {
    try {
      if (formMode === "create") {
        if (formLevel === "country") {
          await createCountryMutation.mutateAsync({ name: values.name, code: values.code || undefined });
          toast.success(t("toasts.countryCreated"));
        } else if (formLevel === "governorate") {
          if (!selectedCountryId) return;
          await createGovernorateMutation.mutateAsync({
            countryId: parseInt(selectedCountryId),
            body: { name: values.name, code: values.code || undefined },
          });
          toast.success(t("toasts.governorateCreated"));
        } else if (formLevel === "city") {
          if (!selectedGovernorateId) return;
          await createCityMutation.mutateAsync({
            governorateId: parseInt(selectedGovernorateId),
            body: { name: values.name, code: values.code || undefined },
          });
          toast.success(t("toasts.cityCreated"));
        } else {
          if (!selectedCityId) return;
          await createAreaMutation.mutateAsync({
            cityId: parseInt(selectedCityId),
            body: { name: values.name, code: values.code || undefined },
          });
          toast.success(t("toasts.areaCreated"));
        }
      } else {
        if (editingItemId == null) return;
        if (formLevel === "country") {
          await updateCountryMutation.mutateAsync({ id: editingItemId, body: { name: values.name, code: values.code || undefined } });
          toast.success(t("toasts.countryUpdated"));
        } else if (formLevel === "governorate") {
          await updateGovernorateMutation.mutateAsync({ id: editingItemId, body: { name: values.name, code: values.code || undefined } });
          toast.success(t("toasts.governorateUpdated"));
        } else if (formLevel === "city") {
          await updateCityMutation.mutateAsync({ id: editingItemId, body: { name: values.name, code: values.code || undefined } });
          toast.success(t("toasts.cityUpdated"));
        } else {
          await updateAreaMutation.mutateAsync({ id: editingItemId, body: { name: values.name, code: values.code || undefined } });
          toast.success(t("toasts.areaUpdated"));
        }
      }
      setFormOpen(false);
      setEditingItemId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("toasts.genericError");
      toast.error(msg);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteItem) return;
    try {
      if (deleteLevel === "country") {
        await deleteCountryMutation.mutateAsync(deleteItem.id);
        toast.success(t("toasts.countryDeleted"));
      } else if (deleteLevel === "governorate") {
        await deleteGovernorateMutation.mutateAsync(deleteItem.id);
        toast.success(t("toasts.governorateDeleted"));
      } else if (deleteLevel === "city") {
        await deleteCityMutation.mutateAsync(deleteItem.id);
        toast.success(t("toasts.cityDeleted"));
      } else {
        await deleteAreaMutation.mutateAsync(deleteItem.id);
        toast.success(t("toasts.areaDeleted"));
      }
      setDeleteOpen(false);
      setDeleteItem(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("toasts.genericError");
      toast.error(msg);
    }
  };

  // const handleEditClick = (level: LocationLevel, item: { id: number; name: string; code: string }) => {
  //   openEditForm(level, item);
  // };

  return (
    <div className="container py-6 space-y-8 p-7">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        action={
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            {t("reset")}
          </Button>
        }
      />

      <LocationSelector
        countries={countries}
        governorates={governorates}
        cities={cities}
        areas={areas}
        loadingCountries={loadingCountries}
        loadingGovs={loadingGovs}
        loadingCities={loadingCities}
        loadingAreas={loadingAreas}
        selectedCountryId={selectedCountryId}
        selectedGovernorateId={selectedGovernorateId}
        selectedCityId={selectedCityId}
        selectedAreaId={selectedAreaId}
        setSelectedCountryId={setSelectedCountryId}
        setSelectedGovernorateId={setSelectedGovernorateId}
        setSelectedCityId={setSelectedCityId}
        setSelectedAreaId={setSelectedAreaId}
        selectedCountry={selectedCountry}
        selectedGov={selectedGov}
        selectedCity={selectedCity}
        selectedArea={selectedArea}
        onCreateLevel={openCreateForm}
        onEditLevel={openEditForm}
        onDeleteLevel={openDeleteConfirm}
      />

      {/* <section className="space-y-4">
        <h2 className="text-xl font-semibold">Manage</h2>
        <LocationManageCard
          title="Countries"
          description="Add, edit, or delete countries."
          items={countries}
          onAdd={() => openCreateForm("country")}
          onEdit={(item) => handleEditClick("country", item)}
          onDelete={(item) => openDeleteConfirm("country", item)}
          addLabel="Add Country"
        />
        <LocationManageCard
          title="Governorates"
          description={selectedCountryId ? `Under ${selectedCountry ?? "country"}. Add, edit, or delete.` : "Select a country above to manage governorates."}
          items={governorates}
          onAdd={() => openCreateForm("governorate")}
          onEdit={(item) => handleEditClick("governorate", item)}
          onDelete={(item) => openDeleteConfirm("governorate", item)}
          addLabel="Add Governorate"
          disabledMessage={!selectedCountryId ? "Select a country above to see governorates." : undefined}
          addDisabled={!selectedCountryId}
        />
        <LocationManageCard
          title="Cities"
          description={selectedGovernorateId ? `Under ${selectedGov ?? "governorate"}. Add, edit, or delete.` : "Select a governorate above to manage cities."}
          items={cities}
          onAdd={() => openCreateForm("city")}
          onEdit={(item) => handleEditClick("city", item)}
          onDelete={(item) => openDeleteConfirm("city", item)}
          addLabel="Add City"
          disabledMessage={!selectedGovernorateId ? "Select a governorate above to see cities." : undefined}
          addDisabled={!selectedGovernorateId}
        />
        <LocationManageCard
          title="Areas"
          description={selectedCityId ? `Under ${selectedCity ?? "city"}. Add, edit, or delete.` : "Select a city above to manage areas."}
          items={areas}
          onAdd={() => openCreateForm("area")}
          onEdit={(item) => handleEditClick("area", item)}
          onDelete={(item) => openDeleteConfirm("area", item)}
          addLabel="Add Area"
          disabledMessage={!selectedCityId ? "Select a city above to see areas." : undefined}
          addDisabled={!selectedCityId}
        />
      </section> */}

      <LocationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        level={formLevel}
        initialValues={formInitialValues}
        onSubmit={handleFormSubmit}
        submitting={submitting}
      />

      <LocationDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        level={deleteLevel}
        itemName={deleteItem?.name ?? ""}
        onConfirm={handleDeleteConfirm}
        submitting={submitting}
      />
    </div>
  );
}
