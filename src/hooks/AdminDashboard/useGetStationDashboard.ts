import axiosInstance from "@/api/config";
import { useQuery } from "@tanstack/react-query";
import { reportError } from "@/lib/errorReporting";
import type { StationDashboardData, StationDashboardResponse } from "@/types/stationDashboard";

const getStationDashboard = async (): Promise<StationDashboardData> => {
  try {
    const response = await axiosInstance.get<StationDashboardResponse>("station/dashboard");
    return response.data.data;
  } catch (error: unknown) {
    reportError("Error fetching station dashboard:", error);
    throw error;
  }
};

export default function useGetStationDashboard() {
  return useQuery({
    queryKey: ["station", "dashboard"],
    queryFn: getStationDashboard,
    staleTime: 30_000,
  });
}
