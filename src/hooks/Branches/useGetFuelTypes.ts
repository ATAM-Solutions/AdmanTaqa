import axiosInstance from "@/api/config";
import { useQuery } from "@tanstack/react-query";

export interface FuelTypeItem {
  id: number;
  name: string;
  code: string;
  /** Catalogue order (server already returns the list sorted). */
  sortOrder?: number | null;
  isActive?: boolean;
}

interface FuelTypesApiResponse {
  success: boolean;
  data: FuelTypeItem[];
}

const getFuelTypes = async (): Promise<FuelTypeItem[]> => {
  const response = await axiosInstance.get<FuelTypesApiResponse>("fuel-types");
  return response.data?.data ?? [];
};

export default function useGetFuelTypes() {
  return useQuery({
    queryKey: ["fuel-types"],
    queryFn: getFuelTypes,
  });
}
