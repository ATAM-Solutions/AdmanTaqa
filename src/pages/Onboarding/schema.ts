import { z } from "zod";
import type { TFunction } from "i18next";

export function createOnboardingFormSchema(t: TFunction) {
  return z.object({
    title: z.string().min(1, t("validation.titleRequired")).trim(),
    description: z.string().optional(),
    content: z.string().optional(),
    order: z.number().min(0, t("validation.orderMin")),
    isActive: z.boolean(),
    imageUrl: z.string().optional(),
  });
}

export type OnboardingFormValues = z.infer<ReturnType<typeof createOnboardingFormSchema>>;

export const defaultOnboardingFormValues: OnboardingFormValues = {
  title: "",
  description: "",
  content: "",
  order: 0,
  isActive: true,
  imageUrl: "",
};
