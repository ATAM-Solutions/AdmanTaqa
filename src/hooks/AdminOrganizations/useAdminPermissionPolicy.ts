import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminOrganizationsService } from "@/api/services/adminOrganizationsService";
import type { SetPermissionPolicyBody } from "@/types/adminOrganization";
import { adminOrganizationKeys } from "./useAdminOrganizations";

/** The Job Title permission policy of ONE company (the key carries the company id, so companies never share cache). */
export function useGetAdminPermissionPolicy(organizationId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: adminOrganizationKeys.permissionPolicy(organizationId ?? ""),
    queryFn: () => adminOrganizationsService.getPermissionPolicy(organizationId!),
    enabled: enabled && organizationId != null,
    retry: false,
    // edited deliberately: never refetch under an open editor
    refetchOnWindowFocus: false,
  });
}

/** Saves changed permissions. The cache is replaced ONLY with what the API returned, so an unconfirmed save is never shown. */
export function useSetAdminPermissionPolicy(organizationId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SetPermissionPolicyBody) => adminOrganizationsService.setPermissionPolicy(organizationId, body),
    onSuccess: (policy) => {
      queryClient.setQueryData(adminOrganizationKeys.permissionPolicy(organizationId), policy);
      queryClient.invalidateQueries({ queryKey: ["admin", "organizations", String(organizationId), "activity"] });
    },
  });
}
