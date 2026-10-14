import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchProviderDirectory, type ProviderClassification } from "@/api/services/stationService";

export default function useProviderDirectory(params: {
  page: number;
  limit: number;
  search: string;
  classification?: ProviderClassification;
}) {
  return useQuery({
    queryKey: ["station", "linked-providers", "directory", params],
    queryFn: () => fetchProviderDirectory(params),
    placeholderData: keepPreviousData,
  });
}
