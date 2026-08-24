import axiosInstance from "@/api/config";
import { useQuery } from "@tanstack/react-query";
import { reportError } from "@/lib/errorReporting";
import type { AdminDashboardData, AdminDashboardResponse } from "@/types/adminDashboard";

const getAdminDashboard = async (): Promise<AdminDashboardData> => {
  try {
    const response = await axiosInstance.get<AdminDashboardResponse>("admin/dashboard");
    return response.data.data;
  } catch (error: unknown) {
    reportError("Error fetching admin dashboard:", error);
    throw error;
  }
};

export default function useGetAdminDashboard() {
  return useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: getAdminDashboard,
    staleTime: 30_000,
  });
}
