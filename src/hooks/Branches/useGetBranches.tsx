import axiosInstance from "@/api/config";
import { useQuery } from "@tanstack/react-query";
import { reportError } from "@/lib/errorReporting";

export interface BranchApiItem {
  id: number;
  organizationId: number;
  areaId: number;
  nameEn: string;
  nameAr: string;
  licenseNumber: string | null;
  stationTypeId: number | null;
  street: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  workingHours: unknown;
  address: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  managerName: string | null;
  managerEmail: string | null;
  managerPhone: string | null;
  managerUserId: number | null;
  status: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  Area?: { id: number; name: string; code: string; cityId: number };
  FuelStationType?: { id: number; name: string; code: string } | null;
  FuelTypes?: { id: number; name: string; code: string }[];
}

interface BranchesApiResponse {
  success: boolean;
  data: BranchApiItem[];
}

const getBranches = async (): Promise<BranchApiItem[]> => {
  try {
    const response = await axiosInstance.get<BranchesApiResponse>("branches");
    return response.data?.data ?? [];
  } catch (error: unknown) {
    reportError("Error fetching branches:", error);
    throw error;
  }
};

export default function useGetBranches() {
  return useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
  });
}
