import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminOrganizationsService } from "@/api/services/adminOrganizationsService";
import type { SetAssetPolicyBody } from "@/types/adminOrganization";
import { adminOrganizationKeys } from "./useAdminOrganizations";

/** The asset-creation policy of ONE company (the key carries the company id, so companies never share cache). */
export function useGetAdminAssetPolicy(organizationId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: adminOrganizationKeys.assetPolicy(organizationId ?? ""),
    queryFn: () => adminOrganizationsService.getAssetPolicy(organizationId!),
    enabled: enabled && organizationId != null,
    // 4xx answers are decisions (unsupported / forbidden / not found / schema not ready), not blips: show them, don't hammer.
    retry: false,
    // The policy is edited deliberately: never refetch under an open editor.
    refetchOnWindowFocus: false,
  });
}

/** Saves the policy. The cache is replaced ONLY with what the API returned, so the UI never shows an unconfirmed save. */
export function useSetAdminAssetPolicy(organizationId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SetAssetPolicyBody) => adminOrganizationsService.setAssetPolicy(organizationId, body),
    onSuccess: (policy) => {
      queryClient.setQueryData(adminOrganizationKeys.assetPolicy(organizationId), policy);
      // the activity log of the company records the change
      queryClient.invalidateQueries({ queryKey: ["admin", "organizations", String(organizationId), "activity"] });
    },
  });
}
