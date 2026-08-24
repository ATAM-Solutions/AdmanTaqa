import axiosInstance from "@/api/config";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reportError } from "@/lib/errorReporting";
import type { BranchApiItem } from "./useGetBranches";

export interface CreateBranchBody {
  nameEn: string;
  nameAr: string;
  licenseNumber?: string;
  stationTypeId: number;
  areaId: number;
  street?: string;
  latitude?: number;
  longitude?: number;
  workingHours?: Record<string, { open?: string; close?: string }>;
  address: string;
  ownerName?: string;
  ownerEmail?: string;
  managerName?: string;
  managerEmail?: string;
  managerPhone?: string;
  fuelTypeIds: number[];
}

interface CreateBranchApiResponse {
  success: boolean;
  data: BranchApiItem;
  message?: string;
}

const createBranch = async (
  body: CreateBranchBody
): Promise<CreateBranchApiResponse> => {
  try {
    const response =
      await axiosInstance.post<CreateBranchApiResponse>("branches", body);
    console.log(response);

    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to create branch");
    }

    return response.data;
  } catch (error: unknown) {
    const err = error as {
      response?: { data?: { message?: string } };
      message?: string;
    };

    const message =
      err.response?.data?.message || err.message || "Something went wrong";

    reportError("Create branch error:", message);

    throw new Error(message);
  }
};

// const createBranch = async (body: CreateBranchBody): Promise<CreateBranchApiResponse> => {
//   const response = await axiosInstance.post<CreateBranchApiResponse>("branches", body);
//   console.log(response);

//   return response.data;
// };

export default function useCreateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBranch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}
