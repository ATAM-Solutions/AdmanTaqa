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
