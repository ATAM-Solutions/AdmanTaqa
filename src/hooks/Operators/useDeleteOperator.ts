import axiosInstance from "@/api/config";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const deleteOperator = async (id: number | string) => {
  const response = await axiosInstance.delete(`operators/${id}`);
  return response.data;
};

export default function useDeleteOperator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => deleteOperator(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operators"] });
    },
  });
}
