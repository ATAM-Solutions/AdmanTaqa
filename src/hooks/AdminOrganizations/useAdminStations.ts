import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminOrganizationsService } from "@/api/services/adminOrganizationsService";
import type { CreateAdminStationBody, UpdateAdminStationBody } from "@/types/adminOrganization";
import { adminOrganizationKeys } from "./useAdminOrganizations";

export function useGetAdminStations(organizationId: number | string | undefined) {
  return useQuery({
    queryKey: adminOrganizationKeys.stations(organizationId ?? ""),
    queryFn: () => adminOrganizationsService.listStations(organizationId!),
    enabled: organizationId != null && organizationId !== "",
  });
}

/** Eligible managers of one company (same rule as the company dashboard's manager-candidates). */
export function useGetManagerCandidates(organizationId: number | string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["admin", "organizations", String(organizationId ?? ""), "manager-candidates"],
    queryFn: () => adminOrganizationsService.listManagerCandidates(organizationId!),
    enabled: enabled && organizationId != null && organizationId !== "",
    // Fail fast: the picker has its own retry button and must not sit on a spinner for the default backoff.
    retry: 1,
    retryDelay: 400,
  });
}

/** One station incl. the users who have access to it (identity only). */
export function useGetAdminStation(organizationId: number | string | undefined, stationId: number | string | undefined) {
  return useQuery({
    queryKey: [...adminOrganizationKeys.stations(organizationId ?? ""), String(stationId ?? "")],
    queryFn: () => adminOrganizationsService.getStation(organizationId!, stationId!),
    enabled: organizationId != null && stationId != null,
  });
}

function useInvalidateStations() {
  const queryClient = useQueryClient();
  return (organizationId: number | string) => {
    queryClient.invalidateQueries({ queryKey: adminOrganizationKeys.stations(organizationId) });
    queryClient.invalidateQueries({ queryKey: adminOrganizationKeys.detail(organizationId) });
    queryClient.invalidateQueries({ queryKey: ["admin", "organizations", "list"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
  };
}

export function useCreateAdminStation() {
  const invalidate = useInvalidateStations();
  return useMutation({
    mutationFn: ({ organizationId, body }: { organizationId: number | string; body: CreateAdminStationBody }) =>
      adminOrganizationsService.createStation(organizationId, body),
    onSuccess: (_, { organizationId }) => invalidate(organizationId),
  });
}

export function useUpdateAdminStation() {
  const invalidate = useInvalidateStations();
  return useMutation({
    mutationFn: ({
      organizationId,
      stationId,
      body,
    }: {
      organizationId: number | string;
      stationId: number | string;
      body: UpdateAdminStationBody;
    }) => adminOrganizationsService.updateStation(organizationId, stationId, body),
    onSuccess: (_, { organizationId }) => invalidate(organizationId),
  });
}
