import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/api/services/authService";
import type { RegisterV2Payload } from "@/api/services/authService";
import type { RegisterV2Response } from "@/types/auth";
import { toast } from "sonner";
import {
  isValidSaudiPhoneDigits,
  toFullSaudiPhone,
  SAUDI_PHONE_ERROR_MESSAGE,
} from "@/lib/validation/phone";

const FILE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

const registerV2Schema = z
  .object({
    organizationName: z.string().min(1, "Organization name is required").max(255),
    organizationType: z.enum(["SERVICE_PROVIDER", "FUEL_STATION"]),
    email: z.string().min(1, "Email is required").email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    fullName: z.string().min(1, "Full name is required").max(255),
    phone: z
      .string()
      .min(9, "Enter 9 digits (starting with 5)")
      .max(9, "Enter 9 digits only")
      .refine(isValidSaudiPhoneDigits, { message: SAUDI_PHONE_ERROR_MESSAGE }),
    licenseNumber: z.string().max(100).optional().or(z.literal("")),
    yearsExperience: z.string().optional(),
    areaId: z.string().optional(),
    cityId: z.string().optional(),
    street: z.string().max(255).optional().or(z.literal("")),
    serviceCategoriesStr: z.string().optional().or(z.literal("")),
    amount: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const needsProfile = data.organizationType === "SERVICE_PROVIDER" || data.organizationType === "FUEL_STATION";
    if (!needsProfile) return;
    if (!data.licenseNumber?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "License number is required", path: ["licenseNumber"] });
    if (data.yearsExperience == null || data.yearsExperience === "") ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Years of experience is required", path: ["yearsExperience"] });
    if (data.areaId == null || data.areaId === "") ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Area ID is required", path: ["areaId"] });
    if (data.cityId == null || data.cityId === "") ctx.addIssue({ code: z.ZodIssueCode.custom, message: "City ID is required", path: ["cityId"] });
    if (!data.street?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Street is required", path: ["street"] });
  });

export type RegisterV2FormValues = z.infer<typeof registerV2Schema>;

export const REGISTER_V2_FILE_KEYS = [
  "org_license",
  "org_registration",
  "org_other",
  "sp_commercial_registration",
  "sp_tax_certificate",
  "sp_technical_certificate",
  "sp_insurance_certificate",
] as const;

const ORG_REQUIRED_FILE_KEYS = ["org_license", "org_registration", "org_other"] as const;
const SP_REQUIRED_FILE_KEYS = [
  "sp_commercial_registration",
  "sp_tax_certificate",
  "sp_technical_certificate",
  "sp_insurance_certificate",
] as const;

export function getRequiredFileKeys(_organizationType: "SERVICE_PROVIDER" | "FUEL_STATION") {
  return [...ORG_REQUIRED_FILE_KEYS, ...SP_REQUIRED_FILE_KEYS] as const;
}

function getErrorMessage(err: unknown): string | null {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response;
    return res?.data?.message ?? null;
  }
  return null;
}

function validateFile(file: File): string | null {
  if (file.size > FILE_MAX_BYTES) return `File exceeds 5 MB: ${file.name}`;
  const type = file.type?.toLowerCase();
  const allowed = ALLOWED_TYPES.some((t) => type === t || type?.startsWith("image/"));
  if (!allowed && type !== "application/pdf") return `File type not allowed (PDF or images): ${file.name}`;
  return null;
}

export function useRegisterV2Form() {
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState<RegisterV2Response | null>(null);
  const [files, setFiles] = useState<Partial<Record<(typeof REGISTER_V2_FILE_KEYS)[number], File>>>({});
  const fileInputRefs = useRef<Partial<Record<(typeof REGISTER_V2_FILE_KEYS)[number], HTMLInputElement | null>>>({});
  const { login } = useAuth();

  const form = useForm<RegisterV2FormValues>({
    resolver: zodResolver(registerV2Schema),
    mode: "onChange",
    defaultValues: {
      organizationName: "",
      organizationType: "SERVICE_PROVIDER",
      email: "",
      password: "",
      fullName: "",
      phone: "",
      licenseNumber: "",
      yearsExperience: "",
      areaId: "",
      cityId: "",
      street: "",
      serviceCategoriesStr: "",
      amount: "",
    },
  });

  const setFile = (key: (typeof REGISTER_V2_FILE_KEYS)[number], file: File | null) => {
    if (!file) {
      setFiles((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }
    const err = validateFile(file);
    if (err) {
      toast.error(err);
      return;
    }
    setFiles((prev) => ({ ...prev, [key]: file }));
  };

  const onSubmit = async (data: RegisterV2FormValues) => {
    setIsLoading(true);
    setApiError(null);
    try {
      const payload: RegisterV2Payload = {
        organizationName: data.organizationName.trim(),
        organizationType: data.organizationType,
        email: data.email.trim(),
        password: data.password,
        fullName: data.fullName.trim(),
        phone: toFullSaudiPhone(data.phone),
      };

      if (data.organizationType === "SERVICE_PROVIDER" || data.organizationType === "FUEL_STATION") {
        const y = data.yearsExperience != null && data.yearsExperience !== "" ? Number(data.yearsExperience) : undefined;
        const aId = data.areaId != null && data.areaId !== "" ? Number(data.areaId) : undefined;
        const cId = data.cityId != null && data.cityId !== "" ? Number(data.cityId) : undefined;
        const amt = data.amount != null && data.amount !== "" ? Number(data.amount) : undefined;
        const hasProfile =
          data.licenseNumber?.trim() ||
          (y != null && !Number.isNaN(y) && y >= 0) ||
          (aId != null && !Number.isNaN(aId) && aId >= 0) ||
          (cId != null && !Number.isNaN(cId) && cId >= 0) ||
          data.street?.trim() ||
          data.serviceCategoriesStr?.trim() ||
          (amt != null && !Number.isNaN(amt) && amt >= 0);
        if (hasProfile) {
          const serviceCategories = data.serviceCategoriesStr?.trim()
            ? data.serviceCategoriesStr.split(/[,،]/).map((s) => s.trim()).filter(Boolean).map((s) => (Number.isNaN(Number(s)) ? s : Number(s)))
            : undefined;
          payload.profile = {
            ...(data.licenseNumber?.trim() ? { licenseNumber: data.licenseNumber.trim() } : {}),
            ...(y != null && !Number.isNaN(y) && y >= 0 ? { yearsExperience: y } : {}),
            ...(aId != null && !Number.isNaN(aId) && aId >= 0 ? { areaId: aId } : {}),
            ...(cId != null && !Number.isNaN(cId) && cId >= 0 ? { cityId: cId } : {}),
            ...(data.street?.trim() ? { street: data.street.trim() } : {}),
            ...(serviceCategories?.length ? { serviceCategories } : {}),
            ...(amt != null && !Number.isNaN(amt) && amt >= 0 ? { amount: amt } : {}),
          };
          if (Object.keys(payload.profile).length === 0) delete payload.profile;
        }
      }

      const formData = new FormData();
      formData.append("payload", JSON.stringify(payload));
      REGISTER_V2_FILE_KEYS.forEach((key) => {
        const file = files[key];
        if (file) formData.append(key, file);
      });

      const response = await authService.registerV2(formData);
      if (response.success && response.data) {
        setRegistrationSuccess(response);
        toast.success(response.message ?? "Organization registered. Pending approval.");
      } else {
        const msg = response.message ?? "Registration failed";
        setApiError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = getErrorMessage(err) ?? "Registration failed. Check fields and files.";
      setApiError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const completeRegistration = () => {
    if (registrationSuccess?.data) {
      login(registrationSuccess.data);
      setRegistrationSuccess(null);
    }
  };

  return {
    ...form,
    submitForm: form.handleSubmit(onSubmit),
    isLoading,
    apiError,
    files,
    setFile,
    fileInputRefs,
    registrationSuccess,
    completeRegistration,
  };
}
