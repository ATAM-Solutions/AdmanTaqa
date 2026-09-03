import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminOrganizationsService } from "@/api/services/adminOrganizationsService";
import type { CreateAdminUserBody, UpdateAdminUserBody } from "@/types/adminOrganization";
import { adminOrganizationKeys } from "./useAdminOrganizations";

export function useGetAdminOrganizationRoles(organizationId: number | string | undefined) {
  return useQuery({
    queryKey: adminOrganizationKeys.roles(organizationId ?? ""),
    queryFn: () => adminOrganizationsService.listRoles(organizationId!),
    enabled: organizationId != null && organizationId !== "",
    staleTime: 60_000,
  });
}

export function useGetAdminOrganizationUsers(organizationId: number | string | undefined) {
  return useQuery({
    queryKey: adminOrganizationKeys.users(organizationId ?? ""),
    queryFn: () => adminOrganizationsService.listUsers(organizationId!),
    enabled: organizationId != null && organizationId !== "",
  });
}

function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return (organizationId: number | string) => {
    queryClient.invalidateQueries({ queryKey: adminOrganizationKeys.users(organizationId) });
    queryClient.invalidateQueries({ queryKey: adminOrganizationKeys.detail(organizationId) });
    queryClient.invalidateQueries({ queryKey: ["admin", "organizations", "list"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["users"] });
  };
}

export function useCreateAdminUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ organizationId, body }: { organizationId: number | string; body: CreateAdminUserBody }) =>
      adminOrganizationsService.createUser(organizationId, body),
    onSuccess: (_, { organizationId }) => invalidate(organizationId),
  });
}

export function useUpdateAdminUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({
      organizationId,
      userId,
      body,
    }: {
      organizationId: number | string;
      userId: number | string;
      body: UpdateAdminUserBody;
    }) => adminOrganizationsService.updateUser(organizationId, userId, body),
    onSuccess: (_, { organizationId }) => invalidate(organizationId),
  });
}

export function useResetAdminUserPassword() {
  return useMutation({
    mutationFn: ({
      organizationId,
      userId,
      password,
    }: {
      organizationId: number | string;
      userId: number | string;
      password: string;
    }) => adminOrganizationsService.resetUserPassword(organizationId, userId, password),
  });
}
