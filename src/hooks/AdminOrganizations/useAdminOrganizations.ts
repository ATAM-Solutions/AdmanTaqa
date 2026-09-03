import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminOrganizationsService, companyBrandingService } from "@/api/services/adminOrganizationsService";
import type {
  AdminOrganizationsListParams,
  CreateAdminOrganizationBody,
  UpdateAdminOrganizationBody,
} from "@/types/adminOrganization";

export const adminOrganizationKeys = {
  all: ["admin", "organizations"] as const,
  list: (params: AdminOrganizationsListParams) => ["admin", "organizations", "list", params] as const,
  detail: (id: number | string) => ["admin", "organizations", String(id)] as const,
  stations: (id: number | string) => ["admin", "organizations", String(id), "stations"] as const,
  users: (id: number | string) => ["admin", "organizations", String(id), "users"] as const,
  roles: (id: number | string) => ["admin", "organizations", String(id), "roles"] as const,
  activity: (id: number | string, page: number) => ["admin", "organizations", String(id), "activity", page] as const,
};

/** Invalidate everything the SUPER_ADMIN screens + dashboard derive from organizations. */
export function useInvalidateAdminOrganizations() {
  const queryClient = useQueryClient();
  return (id?: number | string) => {
    queryClient.invalidateQueries({ queryKey: adminOrganizationKeys.all });
    queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["organizations"] });
    queryClient.invalidateQueries({ queryKey: ["fuel-stations"] });
    if (id != null) queryClient.invalidateQueries({ queryKey: ["organization", Number(id)] });
  };
}

export function useGetAdminOrganizations(params: AdminOrganizationsListParams) {
  return useQuery({
    queryKey: adminOrganizationKeys.list(params),
    queryFn: () => adminOrganizationsService.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useGetAdminOrganization(id: number | string | undefined) {
  return useQuery({
    queryKey: adminOrganizationKeys.detail(id ?? ""),
    queryFn: () => adminOrganizationsService.get(id!),
    enabled: id != null && id !== "",
  });
}

export function useCreateAdminOrganization() {
  const invalidate = useInvalidateAdminOrganizations();
  return useMutation({
    mutationFn: (body: CreateAdminOrganizationBody) => adminOrganizationsService.create(body),
    onSuccess: (org) => invalidate(org.id),
  });
}

export function useUpdateAdminOrganization() {
  const invalidate = useInvalidateAdminOrganizations();
  return useMutation({
    mutationFn: ({ id, body }: { id: number | string; body: UpdateAdminOrganizationBody }) =>
      adminOrganizationsService.update(id, body),
    onSuccess: (_, { id }) => invalidate(id),
  });
}

export function useSetAdminOrganizationActive() {
  const invalidate = useInvalidateAdminOrganizations();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number | string; isActive: boolean }) =>
      adminOrganizationsService.setActive(id, isActive),
    onSuccess: (_, { id }) => invalidate(id),
  });
}

/** Logo upload with progress state (0–100) for the uploader UI. */
export function useUploadAdminOrganizationLogo() {
  const invalidate = useInvalidateAdminOrganizations();
  const [progress, setProgress] = useState(0);
  const mutation = useMutation({
    mutationFn: ({ id, file }: { id: number | string; file: File }) => {
      setProgress(0);
      return adminOrganizationsService.uploadLogo(id, file, setProgress);
    },
    onSuccess: (_, { id }) => invalidate(id),
    onSettled: () => setProgress(0),
  });
  return { ...mutation, progress };
}

export function useRemoveAdminOrganizationLogo() {
  const invalidate = useInvalidateAdminOrganizations();
  return useMutation({
    mutationFn: (id: number | string) => adminOrganizationsService.removeLogo(id),
    onSuccess: (_, id) => invalidate(id),
  });
}

export function useGetAdminOrganizationActivity(id: number | string | undefined, page = 1, limit = 20) {
  return useQuery({
    queryKey: adminOrganizationKeys.activity(id ?? "", page),
    queryFn: () => adminOrganizationsService.activity(id!, page, limit),
    enabled: id != null && id !== "",
    placeholderData: (prev) => prev,
  });
}

// ── Own-company branding (company admin) ────────────────────────────────────
export function useUploadMyCompanyLogo() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);
  const mutation = useMutation({
    mutationFn: (file: File) => {
      setProgress(0);
      return companyBrandingService.uploadMyLogo(file, setProgress);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      queryClient.invalidateQueries({ queryKey: ["station", "dashboard"] });
    },
    onSettled: () => setProgress(0),
  });
  return { ...mutation, progress };
}

export function useRemoveMyCompanyLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => companyBrandingService.removeMyLogo(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      queryClient.invalidateQueries({ queryKey: ["station", "dashboard"] });
    },
  });
}
