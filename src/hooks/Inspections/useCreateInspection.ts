import axiosInstance from "@/api/config";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateInspectionBody, InspectionResponse } from "@/types/inspection";

const createInspection = async (body: CreateInspectionBody): Promise<InspectionResponse> => {
  const response = await axiosInstance.post<InspectionResponse>("inspections", body);
  return response.data;
};

export default function useCreateInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInspection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspections"] });
    },
  });
}
