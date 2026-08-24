import { useState } from "react";
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
import { Loader2 } from "lucide-react";

export type LocationLevel = "country" | "governorate" | "city" | "area";

export interface LocationFormValues {
  name: string;
  code?: string;
}

type LocationFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  level: LocationLevel;
  initialValues?: LocationFormValues;
  onSubmit: (values: LocationFormValues) => void;
  submitting: boolean;
};

const LEVEL_PLACEHOLDER_KEYS: Record<LocationLevel, string | null> = {
  country: "form.placeholders.country",
  governorate: "form.placeholders.governorate",
  city: "form.placeholders.city",
  area: null,
};

export default function LocationFormDialog({
  open,
  onOpenChange,
  mode,
  level,
   onSubmit,
  submitting,
}: LocationFormDialogProps) {
  const { t } = useTranslation("locations");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), code: code.trim() || undefined });
  };

  const label = t(`levels.${level}`);
  const title = mode === "create" ? t("form.add", { level: label }) : t("form.edit", { level: label });
  const placeholderKey = LEVEL_PLACEHOLDER_KEYS[level];
  const namePlaceholder = placeholderKey ? t(placeholderKey) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? t("form.createDescription", { level: label }) : t("form.updateDescription", { level: label })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="loc-name">{t("form.name")}</Label>
            <Input
              id="loc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={namePlaceholder}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc-code">{t("form.code")}</Label>
            <Input
              id="loc-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("form.codePlaceholder")}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("form.cancel")}
            </Button>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "create" ? t("form.create") : t("form.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
