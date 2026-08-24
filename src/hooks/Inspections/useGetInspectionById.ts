import axiosInstance from "@/api/config";
import { useQuery } from "@tanstack/react-query";
import type { InspectionResponse } from "@/types/inspection";

const getInspectionById = async (id: number | string): Promise<InspectionResponse> => {
  const response = await axiosInstance.get<InspectionResponse>(`inspections/${id}`);
  return response.data;
};

export default function useGetInspectionById(id: number | string | null | undefined) {
  return useQuery({
    queryKey: ["inspection", id],
    queryFn: () => getInspectionById(id!),
    enabled: id != null && id !== "",
  });
}
