import axiosInstance from "@/api/config";
import { useQuery } from "@tanstack/react-query";
import type { InspectionsListResponse } from "@/types/inspection";

export interface GetInspectionsParams {
  targetOrganizationId?: number;
  limit?: number;
}

const getInspections = async (
  params?: GetInspectionsParams
): Promise<InspectionsListResponse> => {
  const searchParams = new URLSearchParams();
  if (params?.targetOrganizationId != null)
    searchParams.set("targetOrganizationId", String(params.targetOrganizationId));
  if (params?.limit != null) searchParams.set("limit", String(params.limit));
  const query = searchParams.toString();
  const url = query ? `inspections?${query}` : "inspections";
  const response = await axiosInstance.get<InspectionsListResponse>(url);
  return response.data;
};

export default function useGetInspections(params?: GetInspectionsParams) {
  return useQuery({
    queryKey: ["inspections", params],
    queryFn: () => getInspections(params),
  });
}
