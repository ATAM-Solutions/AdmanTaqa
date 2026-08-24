import axiosInstance from "@/api/config";
import { useQuery } from "@tanstack/react-query";
import { reportError } from "@/lib/errorReporting";
import type { ProviderDashboardData, ProviderDashboardResponse } from "@/types/providerDashboard";

const getProviderDashboard = async (): Promise<ProviderDashboardData> => {
  try {
    const response = await axiosInstance.get<ProviderDashboardResponse>("provider/dashboard");
    return response.data.data;
  } catch (error: unknown) {
    reportError("Error fetching provider dashboard:", error);
    throw error;
  }
};

export default function useGetProviderDashboard() {
  return useQuery({
    queryKey: ["provider", "dashboard"],
    queryFn: getProviderDashboard,
    staleTime: 30_000,
  });
}
