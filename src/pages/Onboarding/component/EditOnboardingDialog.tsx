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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Upload, X } from "lucide-react";
import { ACCEPTED_IMAGE_TYPES } from "../constants";
import type { OnboardingItem } from "@/types/onboarding";
import {
  createOnboardingFormSchema,
  defaultOnboardingFormValues,
  type OnboardingFormValues,
} from "../schema";

export type EditOnboardingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues: OnboardingFormValues;
  editingItem: OnboardingItem | null;
  onSubmit: (data: OnboardingFormValues, imageFile: File | null) => void;
  onCancel: () => void;
  submitting: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  validateImageFile: (file: File) => boolean;
};

export default function EditOnboardingDialog(props: EditOnboardingDialogProps) {
  const {
    open,
    onOpenChange,
    initialValues,
    editingItem,
    onSubmit,
    onCancel,
    submitting,
    fileInputRef,
    isDragging,
    setIsDragging,
    validateImageFile,
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
    if (open && editingItem) {
      form.reset(initialValues);
      setImageAndPreview(null);
    }
  }, [open, editingItem?.id]);

  const handleFormSubmit = form.handleSubmit((data: OnboardingFormValues) => {
    onSubmit(data, imageFile);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onCancel();
          setImageAndPreview(null);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-[520px] h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("editDialog.title")}</DialogTitle>
          <DialogDescription>{t("editDialog.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleFormSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">{t("createDialog.fields.title")}</Label>
            <Input
              id="edit-title"
              {...form.register("title")}
              className={form.formState.errors.title ? "border-destructive" : ""}
            />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-desc">{t("createDialog.fields.description")}</Label>
            <Input id="edit-desc" {...form.register("description")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-content">{t("createDialog.fields.content")}</Label>
            <textarea
              id="edit-content"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...form.register("content")}
            />
          </div>
          <div className="flex gap-4 items-center">
            <div className="space-y-2 flex-1">
              <Label htmlFor="edit-order">{t("createDialog.fields.order")}</Label>
              <Controller
                control={form.control}
                name="order"
                render={({ field }) => (
                  <Input
                    id="edit-order"
                    type="number"
                    min={0}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                    onBlur={field.onBlur}
                    className={form.formState.errors.order ? "border-destructive" : ""}
                  />
                )}
              />
              {form.formState.errors.order && (
                <p className="text-sm text-destructive">{form.formState.errors.order.message}</p>
              )}
            </div>
            <div className="flex items-center gap-2 pt-8">
              <Checkbox
                id="edit-active"
                checked={form.watch("isActive")}
                onCheckedChange={(c) => form.setValue("isActive", !!c)}
              />
              <Label htmlFor="edit-active">{t("createDialog.fields.active")}</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("editDialog.image.label")}</Label>
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
              ) : form.watch("imageUrl") ? (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-2">{t("editDialog.image.currentImage")}</p>
                  <img
                    src={form.watch("imageUrl") ?? ""}
                    alt="Current"
                    className="max-h-40 w-full object-contain rounded mx-auto"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <p className="text-xs text-muted-foreground mt-2">{t("editDialog.image.replaceHint")}</p>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">{t("editDialog.image.dropHint")}</p>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">{t("editDialog.image.orUrl")}</span>
              <Input
                id="edit-image"
                {...form.register("imageUrl")}
                placeholder="https://..."
                className="flex-1"
                dir="ltr"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>{t("editDialog.cancel")}</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {t("editDialog.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
