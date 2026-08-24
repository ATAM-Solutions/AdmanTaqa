import axiosInstance from "@/api/config";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateOperatorBody, OperatorResponse } from "@/types/operator";

const createOperator = async (body: CreateOperatorBody): Promise<OperatorResponse> => {
  const response = await axiosInstance.post<OperatorResponse>("operators", body);
  return response.data;
};

export default function useCreateOperator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createOperator,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operators"] });
    },
  });
}
