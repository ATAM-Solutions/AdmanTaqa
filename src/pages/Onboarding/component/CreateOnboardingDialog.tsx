import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Upload, X } from "lucide-react";
import { ACCEPTED_IMAGE_TYPES } from "../constants";
import {
  createOnboardingFormSchema,
  defaultOnboardingFormValues,
  type OnboardingFormValues,
} from "../schema";

export type CreateOnboardingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  validateImageFile: (file: File) => boolean;
  onSubmit: (data: OnboardingFormValues, imageFile: File | null) => void;
  onCancel: () => void;
  submitting: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  trigger: React.ReactNode;
};

export default function CreateOnboardingDialog(props: CreateOnboardingDialogProps) {
  const {
    open,
    onOpenChange,
    isDragging,
    setIsDragging,
    validateImageFile,
    onSubmit,
    onCancel,
    submitting,
    fileInputRef,
    trigger,
  } = props;

  const { t } = useTranslation("onboarding");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const setImageAndPreview = (file: File | null) => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
    setImageFile(file);
  };

  const schema = useMemo(() => createOnboardingFormSchema(t), [t]);
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultOnboardingFormValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultOnboardingFormValues);
      setImageAndPreview(null);
    }
  }, [open]);

  const handleFormSubmit = form.handleSubmit((data: OnboardingFormValues) => {
    onSubmit(data, imageFile);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setImageAndPreview(null);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("createDialog.title")}</DialogTitle>
          <DialogDescription>{t("createDialog.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleFormSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="create-title">{t("createDialog.fields.title")}</Label>
            <Input
              id="create-title"
              {...form.register("title")}
              placeholder={t("createDialog.fields.titlePlaceholder")}
            />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-desc">{t("createDialog.fields.description")}</Label>
            <Input
              id="create-desc"
              {...form.register("description")}
              placeholder={t("createDialog.fields.descriptionPlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-content">{t("createDialog.fields.content")}</Label>
            <textarea
              id="create-content"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...form.register("content")}
              placeholder={t("createDialog.fields.contentPlaceholder")}
            />
          </div>
          <div className="flex gap-4 items-center">
            <div className="space-y-2 flex-1">
              <Label htmlFor="create-order">{t("createDialog.fields.order")}</Label>
              <Controller
                control={form.control}
                name="order"
                render={({ field }) => (
                  <Input
                    id="create-order"
                    type="number"
                    min={0}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                    onBlur={field.onBlur}
                  />
                )}
              />
              {form.formState.errors.order && (
                <p className="text-sm text-destructive">{form.formState.errors.order.message}</p>
              )}
            </div>
            <div className="flex items-center gap-2 pt-8">
              <Checkbox
                id="create-active"
                checked={form.watch("isActive")}
                onCheckedChange={(c) => form.setValue("isActive", !!c)}
              />
              <Label htmlFor="create-active">{t("createDialog.fields.active")}</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("createDialog.image.label")}</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/30"}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file && validateImageFile(file)) setImageAndPreview(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(",")}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && validateImageFile(file)) setImageAndPreview(file);
                  e.target.value = "";
                }}
              />
              {previewUrl ? (
                <div className="relative inline-block">
                  <img src={previewUrl} alt="Preview" className="max-h-40 rounded object-contain" />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute -top-2 -end-2 h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); setImageAndPreview(null); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">{t("createDialog.image.dropHint")}</p>
                </>
              )}
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>{t("createDialog.cancel")}</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {t("createDialog.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
