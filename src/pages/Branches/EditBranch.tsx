import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
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
import useGetBranchesDetails from "@/hooks/Branches/useGetBranchesDetails";
import useUpdateBranch from "@/hooks/Branches/useUpdateBranch";
import useGetFuelTypes from "@/hooks/Branches/useGetFuelTypes";
import type { UpdateBranchBody } from "@/hooks/Branches/useUpdateBranch";

const STATUS_OPTIONS = ["APPROVED", "PENDING", "REJECTED", "INACTIVE"];

export default function EditBranch() {
  const { t } = useTranslation("branches");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: branch, isLoading: loadingBranch, isError, error } = useGetBranchesDetails(id);
  const { data: fuelTypes = [], isLoading: loadingFuelTypes } = useGetFuelTypes();
  const mutation = useUpdateBranch(id);

  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedFuelTypeIds, setSelectedFuelTypeIds] = useState<number[]>([]);
  const [fuelTypesSelectOpen, setFuelTypesSelectOpen] = useState(false);
  const fuelTypesSelectRef = useRef<HTMLDivElement>(null);

  const toggleFuelType = (fuelId: number) => {
    setSelectedFuelTypeIds((prev) =>
      prev.includes(fuelId) ? prev.filter((x) => x !== fuelId) : [...prev, fuelId]
    );
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fuelTypesSelectRef.current && !fuelTypesSelectRef.current.contains(e.target as Node)) {
        setFuelTypesSelectOpen(false);
      }
    };
    if (fuelTypesSelectOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [fuelTypesSelectOpen]);

  useEffect(() => {
    if (branch) {
      setNameEn(branch.nameEn ?? "");
      setNameAr(branch.nameAr ?? "");
      setAddress(branch.address ?? "");
      setStatus(branch.status ?? "APPROVED");
      setIsActive(branch.isActive ?? true);
      setSelectedFuelTypeIds((branch.FuelTypes ?? []).map((ft) => ft.id));
    }
  }, [branch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const body: UpdateBranchBody = {
      nameEn: nameEn.trim() || undefined,
      nameAr: nameAr.trim() || undefined,
      address: address.trim() || undefined,
      status: status || undefined,
      isActive,
      fuelTypeIds: selectedFuelTypeIds.length > 0 ? selectedFuelTypeIds : undefined,
    };

    try {
      await mutation.mutateAsync(body);
      toast.success(t("toasts.branchUpdated"));
      navigate(`/branches/${id}`, { replace: true });
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      toast.error(msg ?? t("toasts.branchUpdateFailed"));
    }
  };

  const handleCancel = () => navigate(`/branches/${id}`);

  if (loadingBranch || !branch) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-sm font-medium">{t("details.loading")}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-destructive">{error instanceof Error ? error.message : t("details.loadFailed")}</p>
        <Button variant="link" onClick={() => navigate("/branches")}>
          {t("details.backToBranches")}
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in slide-in-from-bottom duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("edit.title")}</h1>
        <p className="text-muted-foreground">{t("edit.subtitle")}</p>
      </div>
      <Card className="p-6 border-none shadow-xl bg-card/60 backdrop-blur-md max-w-2xl">
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
            <Label htmlFor="status">{t("fields.status")}</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue placeholder={t("fields.selectStatus")} />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="isActive"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(!!checked)}
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              {t("fields.activeCheckboxLabel")}
            </Label>
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
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
          </div>
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={mutation.isPending}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {t("actions.saving")}
                </>
              ) : (
                t("actions.updateBranch")
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
