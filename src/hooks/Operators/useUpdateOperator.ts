import axiosInstance from "@/api/config";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateOperatorBody, OperatorResponse } from "@/types/operator";

const updateOperator = async (
  id: number | string,
  body: UpdateOperatorBody
): Promise<OperatorResponse> => {
  const response = await axiosInstance.patch<OperatorResponse>(`operators/${id}`, body);
  return response.data;
};

export default function useUpdateOperator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number | string; body: UpdateOperatorBody }) =>
      updateOperator(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operators"] });
    },
  });
}
